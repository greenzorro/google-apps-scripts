"""
Colab headless TTS worker for google-apps-scripts.

Runs inside a freshly provisioned Colab GPU runtime via pure-HTTP ignition.
Reads job payload from /content/tts_job.json, synthesizes MP3 files with
IndexTTS 2.5 in an isolated Python 3.11 uv environment, uploads MP3 batches
back to the GAS Web App gatekeeper (doPost), and notifies completion.
"""

from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
import time
import traceback
import urllib.error
import urllib.request


JOB_PATH = "/content/tts_job.json"
VENV_DIR = "/content/venv_idx"
VENV_PYTHON = f"{VENV_DIR}/bin/python"
REPO_DIR = "/content/index-tts"
OUT_DIR = "/content/out"


def log(msg: str) -> None:
    print(f"[tts_worker] {msg}", flush=True)


def run_cmd(cmd: str, cwd: str | None = None) -> None:
    log(f"Running: {cmd}")
    t0 = time.time()
    proc = subprocess.run(
        cmd,
        shell=True,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    dt = round(time.time() - t0, 2)
    if proc.returncode != 0:
        tail = proc.stdout[-2000:] if proc.stdout else ""
        raise RuntimeError(f"Command failed ({proc.returncode}) in {dt}s: {cmd}\n{tail}")
    log(f"Finished in {dt}s")


def post_callback(callback_url: str, payload: dict, retries: int = 3) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                callback_url, data=data, headers=headers, method="POST"
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
                try:
                    return json.loads(raw)
                except Exception:
                    return {"status": resp.status, "raw": raw[:300]}
        except Exception as exc:
            last_err = exc
            log(f"Callback attempt {attempt}/{retries} failed: {exc}")
            if attempt < retries:
                time.sleep(3 * attempt)
    raise RuntimeError(f"Callback failed after {retries} attempts: {last_err}")


def bootstrap_and_reexec() -> None:
    boot_ts = time.time()
    with open(JOB_PATH, "r", encoding="utf-8") as f:
        job = json.load(f)

    callback_url = job["callback_url"]
    job_id = job["job_id"]
    callback_token = job["callback_token"]

    try:
        ref_url = job.get("ref_audio_url")
        ref_path = job.get("ref_audio_path", "/content/ref_serena.wav")
        if ref_url and not os.path.exists(ref_path):
            log(f"Downloading reference voice from {ref_url}...")
            urllib.request.urlretrieve(ref_url, ref_path)

        if not os.path.exists(REPO_DIR):
            run_cmd(
                f"git clone --depth 1 https://github.com/index-tts/index-tts.git {REPO_DIR}"
            )

        if not os.path.exists(VENV_PYTHON):
            run_cmd(
                f"uv venv --python 3.11 {VENV_DIR} && "
                f"uv pip install --python {VENV_PYTHON} -e {REPO_DIR} "
                f"huggingface_hub soundfile torchaudio"
            )

        log("Re-executing inside isolated Python 3.11 environment...")
        env = os.environ.copy()
        env["TTS_BOOT_TS"] = str(boot_ts)
        proc = subprocess.run([VENV_PYTHON, "-u", __file__, "--infer"], env=env)
        if proc.returncode != 0:
            raise RuntimeError(f"Inference process exited with code {proc.returncode}")
    except Exception as exc:
        err_msg = f"{exc}\n{traceback.format_exc()}"
        log(f"Bootstrap fatal error: {err_msg}")
        try:
            post_callback(
                callback_url,
                {
                    "action": "error",
                    "job_id": job_id,
                    "token": callback_token,
                    "error": err_msg[-1500:],
                },
            )
        except Exception as cb_exc:
            log(f"Failed to report error callback: {cb_exc}")
        raise


def split_news_sentences(raw_text: str) -> list[str]:
    """Split formatted news text into short sentences to prevent skipping."""
    raw_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    merged_lines: list[str] = []
    i = 0
    while i < len(raw_lines):
        line = raw_lines[i]
        if line in ("AI总结：", "AI总结:", "新闻原文：", "新闻原文:") and i + 1 < len(
            raw_lines
        ):
            merged_lines.append(f"{line}{raw_lines[i + 1]}")
            i += 2
        else:
            merged_lines.append(line)
            i += 1

    normalized_lines: list[str] = []
    for line in merged_lines:
        stripped_tail = line.rstrip("”\"'」』）)]")
        if stripped_tail and stripped_tail[-1] not in "。！？!?：:":
            line += "。"
        normalized_lines.append(line)

    joined = "".join(normalized_lines)
    chunks = [
        s.strip()
        for s in re.split(r"(?<=[。！？!?])[”\"'」』）)]*\s*", joined)
        if s and re.search(r"[0-9A-Za-z\u4e00-\u9fff]", s)
    ]

    # Guard against extra-long clauses without periods (>150 chars)
    final_chunks: list[str] = []
    for chunk in chunks:
        if len(chunk) <= 150:
            final_chunks.append(chunk)
            continue
        sub_parts = re.split(r"(?<=[，；,;])\s*", chunk)
        buf = ""
        for part in sub_parts:
            if buf and len(buf) + len(part) > 120:
                final_chunks.append(buf)
                buf = part
            else:
                buf += part
        if buf:
            final_chunks.append(buf)

    return final_chunks


def run_inference() -> None:
    import numpy as np
    import soundfile as sf
    import torch
    from huggingface_hub import snapshot_download

    sys.path.insert(0, REPO_DIR)
    from indextts.infer_v2_5 import IndexTTS2

    t_total0 = time.time()
    boot_ts = float(os.environ.get("TTS_BOOT_TS", t_total0))
    os.makedirs(OUT_DIR, exist_ok=True)

    with open(JOB_PATH, "r", encoding="utf-8") as f:
        job = json.load(f)

    job_id = job["job_id"]
    callback_url = job["callback_url"]
    callback_token = job["callback_token"]
    ref_audio_path = job.get("ref_audio_path", "/content/ref_serena.wav")
    items = job.get("items", [])
    batch_size = max(1, int(job.get("batch_size", 3)))
    max_wall_seconds = float(job.get("max_wall_seconds", 0) or 0)

    try:
        if not items:
            post_callback(
                callback_url,
                {
                    "action": "complete",
                    "job_id": job_id,
                    "token": callback_token,
                    "summary": {"processed": 0, "succeeded": 0, "failed": 0},
                },
            )
            return

        t_dl0 = time.time()
        ckpt_dir = os.path.join(REPO_DIR, "checkpoints")
        snapshot_download("IndexTeam/IndexTTS-2.5", local_dir=ckpt_dir)
        dl_sec = round(time.time() - t_dl0, 2)

        t_load0 = time.time()
        cap = torch.cuda.get_device_capability(0) if torch.cuda.is_available() else (0, 0)
        use_bf16 = cap[0] >= 8
        gpu_name = (
            torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
        )
        tts = IndexTTS2(
            cfg_path=os.path.join(ckpt_dir, "config.yaml"),
            model_dir=ckpt_dir,
            use_bf16=use_bf16,
        )
        load_sec = round(time.time() - t_load0, 2)
        log(f"Model ready on {gpu_name} (bf16={use_bf16}) in dl={dl_sec}s load={load_sec}s")

        batch_files: list[dict[str, str]] = []
        succeeded = 0
        failed = 0
        stopped_early = False
        total_audio_sec = 0.0
        errors: list[str] = []

        for idx, item in enumerate(items, start=1):
            if idx > 1 and max_wall_seconds > 0 and (time.time() - boot_ts) >= max_wall_seconds:
                stopped_early = True
                log(
                    f"Time budget ({max_wall_seconds:.0f}s) reached at item "
                    f"{idx}/{len(items)}; handing off cleanly."
                )
                break
            mp3_name = item["name"]
            text = item.get("text", "")
            try:
                sentences = split_news_sentences(text)
                if not sentences:
                    continue

                pieces = []
                sr_out = 22050
                for s_idx, sent in enumerate(sentences):
                    seg_wav = f"/content/seg_{idx}_{s_idx}.wav"
                    tts.infer(
                        spk_audio_prompt=ref_audio_path,
                        text=sent,
                        output_path=seg_wav,
                        lang="zh",
                    )
                    wav_arr, sr_out = sf.read(seg_wav, dtype="float32")
                    if wav_arr.ndim > 1:
                        wav_arr = wav_arr[:, 0]
                    pieces.append(wav_arr)
                    pieces.append(np.zeros(int(sr_out * 0.18), dtype=np.float32))
                    os.remove(seg_wav)

                full_wav = np.concatenate(pieces)
                joined_wav = f"/content/joined_{idx}.wav"
                mp3_path = os.path.join(OUT_DIR, mp3_name)
                sf.write(joined_wav, full_wav, sr_out)

                subprocess.run(
                    [
                        "ffmpeg",
                        "-y",
                        "-i",
                        joined_wav,
                        "-ac",
                        "1",
                        "-b:a",
                        "128k",
                        mp3_path,
                    ],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=True,
                )
                os.remove(joined_wav)

                audio_sec = len(full_wav) / float(sr_out)
                total_audio_sec += audio_sec

                with open(mp3_path, "rb") as mf:
                    mp3_b64 = base64.b64encode(mf.read()).decode("ascii")
                os.remove(mp3_path)

                batch_files.append({"name": mp3_name, "content_base64": mp3_b64})
                succeeded += 1
                log(f"[{idx}/{len(items)}] Synthesized {mp3_name} ({audio_sec:.1f}s)")

                if len(batch_files) >= batch_size:
                    resp = post_callback(
                        callback_url,
                        {
                            "action": "upload_batch",
                            "job_id": job_id,
                            "token": callback_token,
                            "files": batch_files,
                        },
                    )
                    log(f"Uploaded batch of {len(batch_files)} MP3s -> {resp}")
                    batch_files = []
            except Exception as item_exc:
                failed += 1
                err_line = f"{mp3_name}: {item_exc}"
                errors.append(err_line)
                log(f"[{idx}/{len(items)}] Failed {err_line}")

        if batch_files:
            resp = post_callback(
                callback_url,
                {
                    "action": "upload_batch",
                    "job_id": job_id,
                    "token": callback_token,
                    "files": batch_files,
                },
            )
            log(f"Uploaded final batch of {len(batch_files)} MP3s -> {resp}")

        total_sec = round(time.time() - t_total0, 2)
        wall_sec = round(time.time() - boot_ts, 2)
        processed = succeeded + failed
        summary = {
            "gpu": gpu_name,
            "use_bf16": use_bf16,
            "processed": processed,
            "succeeded": succeeded,
            "failed": failed,
            "stopped_early": stopped_early,
            "remaining": max(0, len(items) - processed),
            "total_audio_sec": round(total_audio_sec, 1),
            "dl_sec": dl_sec,
            "load_sec": load_sec,
            "total_sec": total_sec,
            "wall_sec": wall_sec,
            "errors": errors[:10],
        }
        resp = post_callback(
            callback_url,
            {
                "action": "complete",
                "job_id": job_id,
                "token": callback_token,
                "summary": summary,
            },
        )
        log(f"Completion callback acknowledged: {resp}")
    except Exception as exc:
        err_msg = f"{exc}\n{traceback.format_exc()}"
        log(f"Inference fatal error: {err_msg}")
        try:
            post_callback(
                callback_url,
                {
                    "action": "error",
                    "job_id": job_id,
                    "token": callback_token,
                    "error": err_msg[-1500:],
                },
            )
        except Exception as cb_exc:
            log(f"Failed to report error callback: {cb_exc}")
        raise


if __name__ == "__main__":
    if "--infer" in sys.argv:
        run_inference()
    else:
        bootstrap_and_reexec()
