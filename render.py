#!/usr/bin/env python3
"""Render Bar Brother content from a JSON brief.

  render.py post content/x.json            -> output/<slug>.jpg
  render.py carousel content/x.json        -> output/<slug>_1.jpg, _2.jpg ...
  render.py reel content/x.json            -> output/<slug>.mp4
  render.py reel content/x.json --frames 3.5 9.1  -> test stills only
"""
import json, subprocess, sys, wave, os
from pathlib import Path
import numpy as np
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).parent
OUT = ROOT / "output"
OUT.mkdir(exist_ok=True)
FPS = 30
VENC = ["-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(FPS), "-g", str(FPS)]


def open_page(pw, w, h, template):
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
    page.goto((ROOT / "templates" / template).as_uri())
    page.evaluate("document.fonts.ready")
    return browser, page


def render_post(c):
    with sync_playwright() as pw:
        browser, page = open_page(pw, 1080, 1350, "post.html")
        bad = page.evaluate("c => init(c)", c)
        if bad:
            sys.exit(f"Text overflow: {bad}")
        path = OUT / f"{c['slug']}.jpg"
        page.screenshot(path=str(path), type="jpeg", quality=95)
        browser.close()
    print(path)


def render_carousel(c):
    with sync_playwright() as pw:
        browser, page = open_page(pw, 1080, 1350, "post.html")
        for i, s in enumerate(c["slides"], 1):
            page.goto((ROOT / "templates" / c.get("template", "post.html")).as_uri())
            page.evaluate("document.fonts.ready")
            bad = page.evaluate("c => init(c)", s)
            if bad:
                sys.exit(f"Text overflow on slide {i}: {bad}")
            path = OUT / f"{c['slug']}_{i}.jpg"
            page.screenshot(path=str(path), type="jpeg", quality=95)
            print(path)
        browser.close()


def synth_music(seconds, starts, path, sr=48000, bpm=104):
    """Original kick/hat/bass loop with a thud on every scene change."""
    n = int(seconds * sr)
    mix = np.zeros(n + sr)
    beat = 60 / bpm
    rng = np.random.default_rng(4)

    def add(sig, t, gain):
        i = int(t * sr)
        end = min(len(mix), i + len(sig))
        if i < len(mix):
            mix[i:end] += sig[: end - i] * gain

    tk = np.arange(int(.28 * sr)) / sr
    kick = np.sin(2 * np.pi * (46 * tk + 38 * (1 - np.exp(-tk * 30)))) * np.exp(-tk * 13)
    th = np.arange(int(.05 * sr)) / sr
    hat = np.diff(rng.normal(0, 1, len(th) + 1)) * np.exp(-th * 95)
    ts = np.arange(int(.2 * sr)) / sr
    snare = (rng.normal(0, 1, len(ts)) * .7 + np.sin(2 * np.pi * 190 * ts) * .5) * np.exp(-ts * 22)
    bass_notes = [55.0, 55.0, 65.41, 49.0]

    t, step = 0.0, 0
    while t < seconds:
        pos = step % 16
        if pos in (0, 6, 8, 11):
            add(kick, t, .85)
        if pos in (4, 12):
            add(snare, t, .34)
        if pos % 2 == 0:
            add(hat, t, .16)
        if pos % 4 == 0:
            f = bass_notes[(step // 16) % 4]
            tb = np.arange(int(beat * .9 * sr)) / sr
            add(np.tanh(np.sin(2 * np.pi * f * tb) * 2) * np.exp(-tb * 2.5), t, .24)
        t += beat / 4
        step += 1

    tt = np.arange(int(.35 * sr)) / sr
    thud = np.sin(2 * np.pi * 70 * tt * np.exp(-tt * 3)) * np.exp(-tt * 12)
    for s in starts[1:]:
        add(thud, s, .5)

    mix = mix[:n]
    fade = int(.6 * sr)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix = np.tanh(mix * 1.1)
    mix = mix / np.max(np.abs(mix)) * .72
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def synth_pad(seconds, starts, path, sr=48000):
    """Original soft ambient bed with a light tick on each scene change."""
    n = int(seconds * sr)
    t = np.arange(n) / sr
    mix = np.zeros(n)
    for f, g in [(55.0, .34), (110.0, .2), (164.81, .13), (220.0, .08), (329.63, .05)]:
        lfo = .75 + .25 * np.sin(2 * np.pi * (.07 + f / 4000) * t)
        mix += g * lfo * np.sin(2 * np.pi * f * t)
    beat = 60 / 84
    for k in range(int(seconds / beat)):
        i = int(k * beat * sr)
        tp = np.arange(int(.5 * sr)) / sr
        s = np.sin(2 * np.pi * 52 * tp) * np.exp(-tp * 9) * .3
        end = min(n, i + len(s))
        mix[i:end] += s[: end - i]
    for st in starts[1:]:
        i = int(st * sr)
        tc = np.arange(int(.07 * sr)) / sr
        s = np.sin(2 * np.pi * 1200 * tc) * np.exp(-tc * 70) * .18
        end = min(n, i + len(s))
        mix[i:end] += s[: end - i]
    fade = int(1.2 * sr)
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix = np.tanh(mix) / np.max(np.abs(np.tanh(mix))) * .6
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes(pcm.tobytes())


def render_reel(c, frames=None):
    work = OUT / f".{c['slug']}"
    work.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        browser, page = open_page(pw, 1080, 1920, c.get("template", "reel.html"))
        info = page.evaluate("c => init(c)", c)
        if info["bad"]:
            sys.exit(f"Text overflow: {info['bad']}")
        if frames:
            for t in frames:
                page.evaluate("t => seek(t)", t)
                p = work / f"still_{t:05.2f}.jpg"
                page.screenshot(path=str(p), type="jpeg", quality=80)
                print(p)
            browser.close()
            return
        parts = []
        for i, (start, dur) in enumerate(zip(info["starts"], info["durs"])):
            final, tmp = work / f"s{i:02d}.mp4", work / f"s{i:02d}.tmp.mp4"
            ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS),
                                   "-c:v", "mjpeg", "-i", "-", "-vf", "format=yuv420p", *VENC, str(tmp)], stdin=subprocess.PIPE)
            for f in range(round(dur * FPS)):
                page.evaluate("t => seek(t)", start + f / FPS)
                ff.stdin.write(page.screenshot(type="jpeg", quality=92))
            ff.stdin.close()
            if ff.wait() != 0:
                sys.exit(f"ffmpeg failed on scene {i}")
            os.replace(tmp, final)
            parts.append(final)
        browser.close()
    listing = work / "list.txt"
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    wav = work / "music.wav"
    (synth_pad if c.get("music") == "pad" else synth_music)(info["total"], info["starts"], wav)
    out = OUT / f"{c['slug']}.mp4"
    subprocess.check_call(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(listing), "-i", str(wav),
                           "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                           "-movflags", "+faststart", str(out)])
    print(out)


if __name__ == "__main__":
    kind, src, *rest = sys.argv[1:]
    content = json.loads(Path(src).read_text())
    if kind == "post":
        render_post(content)
    elif kind == "carousel":
        render_carousel(content)
    else:
        frames = [float(x) for x in rest[1:]] if rest and rest[0] == "--frames" else None
        render_reel(content, frames)
