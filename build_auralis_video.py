import os
import math
import subprocess
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from scipy.io import wavfile
from scipy.signal import butter, lfilter
import imageio_ffmpeg
import arabic_reshaper
from bidi.algorithm import get_display

W, H = 1080, 1920
FPS = 30
DURATION = 19.5
TOTAL_FRAMES = int(DURATION * FPS)

os.makedirs("output", exist_ok=True)


def shape_fa(text: str) -> str:
    return get_display(arabic_reshaper.reshape(text))


# ---------------------------------------------------------
# 1. BESPOKE LUXURY PIANO + ORCHESTRAL + PEARL ASMR AUDIO
# ---------------------------------------------------------
def generate_audio(wav_path: str):
    sr = 44100
    n_samples = int(DURATION * sr)
    t = np.linspace(0, DURATION, n_samples, endpoint=False)

    left = np.zeros(n_samples, dtype=np.float64)
    right = np.zeros(n_samples, dtype=np.float64)

    def add_piano_note(start_t, freq, dur, amp=0.12, pan=0.0):
        idx0 = int(start_t * sr)
        if idx0 >= n_samples:
            return
        idx1 = min(n_samples, idx0 + int(dur * sr))
        nt = np.arange(idx1 - idx0) / sr
        # Warm felt grand piano envelope + harmonics
        env = (1.0 - np.exp(-nt * 90.0)) * (
            0.7 * np.exp(-nt * 1.45) + 0.3 * np.exp(-nt * 0.45)
        )
        # Fade out tail
        tail = np.clip((dur - nt) * 8.0, 0.0, 1.0)
        env *= tail
        # Slight detuned unison strings for realism
        sig = (
            1.00 * np.sin(2 * np.pi * freq * nt)
            + 0.42 * np.sin(2 * np.pi * (freq * 2.0006) * nt) * np.exp(-nt * 2.2)
            + 0.16 * np.sin(2 * np.pi * (freq * 3.0015) * nt) * np.exp(-nt * 3.5)
            + 0.06 * np.sin(2 * np.pi * (freq * 4.003) * nt) * np.exp(-nt * 5.0)
        )
        # Subtle hammer felt thump
        hammer = 0.08 * np.sin(2 * np.pi * 110 * nt) * np.exp(-nt * 55.0)
        wave = (sig + hammer) * env * amp
        l_gain = math.sqrt(0.5 * (1.0 - pan))
        r_gain = math.sqrt(0.5 * (1.0 + pan))
        left[idx0:idx1] += wave * l_gain
        right[idx0:idx1] += wave * r_gain

    def add_string_pad(start_t, dur, freqs, amp=0.045):
        idx0 = int(start_t * sr)
        if idx0 >= n_samples:
            return
        idx1 = min(n_samples, idx0 + int(dur * sr))
        nt = np.arange(idx1 - idx0) / sr
        attack = 0.5 * (1.0 - np.cos(np.pi * np.clip(nt / 1.1, 0.0, 1.0)))
        release = 0.5 * (1.0 - np.cos(np.pi * np.clip((dur - nt) / 1.2, 0.0, 1.0)))
        env = attack * release
        vib = 1.0 + 0.0022 * np.sin(2 * np.pi * 5.2 * nt)
        w_l = np.zeros_like(nt)
        w_r = np.zeros_like(nt)
        for i, f in enumerate(freqs):
            det_l = f * (1.0 - 0.0015 * ((i % 2) * 2 - 1))
            det_r = f * (1.0 + 0.0018 * ((i % 2) * 2 - 1))
            w_l += (
                0.65 * np.sin(2 * np.pi * det_l * vib * nt)
                + 0.25 * np.sin(2 * np.pi * det_l * 2 * nt)
                + 0.10 * np.sin(2 * np.pi * det_l * 3 * nt)
            )
            w_r += (
                0.65 * np.sin(2 * np.pi * det_r * vib * nt + 0.3)
                + 0.25 * np.sin(2 * np.pi * det_r * 2 * nt + 0.6)
                + 0.10 * np.sin(2 * np.pi * det_r * 3 * nt + 0.9)
            )
        left[idx0:idx1] += w_l * env * (amp / len(freqs))
        right[idx0:idx1] += w_r * env * (amp / len(freqs))

    # Note helper (A4 = 440Hz)
    note_map = {
        "C": -9, "C#": -8, "Db": -8, "D": -7, "D#": -6, "Eb": -6,
        "E": -5, "F": -4, "F#": -3, "Gb": -3, "G": -2, "G#": -1,
        "Ab": -1, "A": 0, "A#": 1, "Bb": 1, "B": 2,
    }

    def hz(name, octave):
        semis = note_map[name] + (octave - 4) * 12
        return 440.0 * (2.0 ** (semis / 12.0))

    # 4-chord emotional luxury progression across 19.5s:
    # Bar 1 (0.0 - 4.5s): D minor 9 (Intimate mystery - placing the ring)
    # Bar 2 (4.5 - 9.0s): Bb major 7 (Warm anticipation - closing the pearl box)
    # Bar 3 (9.0 - 14.5s): G minor 9 -> A7sus4 (Romantic swell - opening the box at proposal)
    # Bar 4 (14.5 - 19.5s): D minor add9 / F major7 (Luminous resolution - AURALIS reveal)
    add_string_pad(0.0, 5.0, [hz("D", 2), hz("A", 2), hz("F", 3), hz("A", 3), hz("E", 4)], amp=0.07)
    add_string_pad(4.3, 5.2, [hz("Bb", 1), hz("F", 2), hz("D", 3), hz("A", 3), hz("C", 4)], amp=0.08)
    add_string_pad(9.0, 3.2, [hz("G", 2), hz("D", 3), hz("Bb", 3), hz("F", 4), hz("A", 4)], amp=0.095)
    add_string_pad(11.8, 3.6, [hz("A", 1), hz("E", 2), hz("G", 3), hz("C#", 4), hz("E", 4)], amp=0.105)
    add_string_pad(14.8, 4.7, [hz("D", 2), hz("A", 2), hz("F", 3), hz("A", 3), hz("E", 4), hz("F", 4)], amp=0.11)

    # Expressive piano melody & arpeggio pattern
    melody = [
        # Bar 1: D minor 9
        (0.15, hz("D", 3), 3.8, 0.11, -0.2),
        (0.50, hz("A", 3), 3.2, 0.09, -0.1),
        (0.85, hz("F", 4), 2.8, 0.11, 0.1),
        (1.25, hz("E", 4), 2.5, 0.10, 0.2),
        (1.75, hz("A", 4), 2.8, 0.12, 0.25),
        (2.40, hz("G", 4), 2.2, 0.10, 0.1),
        (3.05, hz("F", 4), 2.2, 0.10, -0.1),
        (3.65, hz("E", 4), 2.0, 0.09, 0.15),
        # Bar 2: Bb maj7 (Closing the lid)
        (4.35, hz("Bb", 2), 4.0, 0.12, -0.25),
        (4.70, hz("F", 3), 3.5, 0.09, -0.1),
        (5.05, hz("D", 4), 3.0, 0.11, 0.1),
        (5.45, hz("A", 4), 3.2, 0.13, 0.25),
        (6.15, hz("G", 4), 2.5, 0.10, 0.15),
        (6.80, hz("F", 4), 2.5, 0.11, 0.0),
        (7.50, hz("D", 4), 2.2, 0.09, -0.15),
        (8.15, hz("C", 4), 2.0, 0.09, 0.1),
        # Bar 3: Proposal build & opening the pearl box (9.0s - 14.8s)
        (9.00, hz("G", 2), 3.5, 0.12, -0.25),
        (9.35, hz("D", 3), 3.2, 0.10, -0.1),
        (9.70, hz("Bb", 3), 3.0, 0.11, 0.05),
        (10.10, hz("A", 4), 3.0, 0.13, 0.2),
        (10.75, hz("Bb", 4), 2.8, 0.13, 0.25),
        (11.40, hz("A", 4), 2.5, 0.11, 0.1),
        # 12.0s: The pearl box lid opens! Magical ascending arpeggio
        (12.00, hz("A", 2), 3.5, 0.13, -0.2),
        (12.25, hz("E", 3), 3.2, 0.11, -0.1),
        (12.50, hz("A", 3), 3.0, 0.11, 0.0),
        (12.75, hz("C#", 4), 3.0, 0.12, 0.15),
        (13.00, hz("E", 4), 3.2, 0.13, 0.25),
        (13.30, hz("A", 4), 3.5, 0.14, 0.3),
        (13.70, hz("C#", 5), 3.5, 0.14, 0.35),
        (14.15, hz("E", 5), 3.8, 0.15, 0.2),
        # Bar 4: AURALIS Finale (15.0s - 19.5s)
        (15.00, hz("D", 2), 4.4, 0.14, -0.2),
        (15.05, hz("D", 3), 4.3, 0.12, -0.1),
        (15.25, hz("A", 3), 4.1, 0.11, 0.0),
        (15.50, hz("F", 4), 3.9, 0.13, 0.15),
        (15.80, hz("A", 4), 3.6, 0.13, 0.25),
        (16.20, hz("E", 5), 3.2, 0.14, 0.2),
        (16.65, hz("D", 5), 2.8, 0.15, 0.0),
    ]
    for st, f, d, a, p in melody:
        add_piano_note(st, f, d, a, p)

    # Subtle tactile ASMR sound effects for the pearl box & ring actions
    rng = np.random.default_rng(42)

    def add_pearl_click_shimmer(start_t, freqs, amp=0.035):
        for i, f in enumerate(freqs):
            idx0 = int((start_t + i * 0.055) * sr)
            if idx0 >= n_samples:
                continue
            dur = 0.45
            idx1 = min(n_samples, idx0 + int(dur * sr))
            nt = np.arange(idx1 - idx0) / sr
            env = np.exp(-nt * 18.0) * (1.0 - np.exp(-nt * 200.0))
            sig = (
                np.sin(2 * np.pi * f * nt)
                + 0.5 * np.sin(2 * np.pi * (f * 2.41) * nt) * np.exp(-nt * 35.0)
            ) * env * amp
            pan = -0.3 + 0.6 * (i / max(1, len(freqs) - 1))
            left[idx0:idx1] += sig * (0.5 - 0.3 * pan)
            right[idx0:idx1] += sig * (0.5 + 0.3 * pan)

    # 1) 4.2s: Ring gently settling into plush velvet + soft pearl touch
    add_pearl_click_shimmer(4.25, [1850, 2320, 2780], amp=0.022)
    # 2) 7.8s - 8.4s: Delicate pearl beads touching as the clamshell lid closes
    add_pearl_click_shimmer(7.85, [2100, 1760, 1480, 1320], amp=0.028)
    # 3) 12.1s - 13.0s: Crystalline pearl shimmer as the lid opens at the proposal
    add_pearl_click_shimmer(12.15, [1560, 1980, 2480, 3120, 3720, 4180], amp=0.026)
    # 4) 16.2s: Soft golden chime on AURALIS brand reveal
    add_pearl_click_shimmer(16.20, [2349.3, 3520.0, 4698.6], amp=0.024)

    # Stereo concert hall reverb (multi-tap feedback delay approximation)
    delays_ms = [(43, 0.26), (79, 0.20), (131, 0.15), (211, 0.11), (337, 0.07)]
    rev_l = left.copy()
    rev_r = right.copy()
    for d_ms, gain in delays_ms:
        d_samp = int(d_ms * sr / 1000.0)
        if d_samp < n_samples:
            rev_l[d_samp:] += right[:-d_samp] * gain
            rev_r[d_samp:] += left[:-d_samp] * gain

    # Master fade-in (0.4s) and fade-out (1.3s)
    fade_in = np.clip(t / 0.4, 0.0, 1.0)
    fade_out = np.clip((DURATION - t) / 1.3, 0.0, 1.0)
    master_env = fade_in * fade_out

    rev_l *= master_env
    rev_r *= master_env

    # Normalize cleanly to -1.5 dBFS
    peak = max(np.max(np.abs(rev_l)), np.max(np.abs(rev_r)), 1e-6)
    scale = 0.84 / peak
    stereo = np.stack([rev_l * scale, rev_r * scale], axis=1)
    stereo_int16 = np.clip(stereo * 32767.0, -32768, 32767).astype(np.int16)
    wavfile.write(wav_path, sr, stereo_int16)
    print("Generated audio:", wav_path)


# ---------------------------------------------------------
# 2. IMAGE LOADING, COLOR GRADING & OPTICAL-FLOW MORPHING
# ---------------------------------------------------------
def load_and_fit(path: str) -> np.ndarray:
    """Load an image, fit/crop to 1080x1920 RGB float32 [0..255]."""
    img = Image.open(path).convert("RGB")
    iw, ih = img.size
    target_ratio = W / H
    src_ratio = iw / ih
    if src_ratio > target_ratio:
        new_w = int(ih * target_ratio)
        left = (iw - new_w) // 2
        img = img.crop((left, 0, left + new_w, ih))
    else:
        new_h = int(iw / target_ratio)
        top = (ih - new_h) // 2
        img = img.crop((0, top, iw, top + new_h))
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    return np.asarray(img, dtype=np.float32)


def zoom_pan(arr: np.ndarray, scale: float, dx: float = 0.0, dy: float = 0.0) -> np.ndarray:
    """Sub-pixel affine zoom and pan around image center."""
    cx, cy = W * 0.5 + dx, H * 0.5 + dy
    M = np.array([
        [scale, 0.0, (1.0 - scale) * cx - dx],
        [0.0, scale, (1.0 - scale) * cy - dy],
    ], dtype=np.float32)
    return cv2.warpAffine(arr, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT_101)


def compute_flow_pair(img_a: np.ndarray, img_b: np.ndarray):
    """Compute bidirectional optical flow on downscaled images for smooth morphing."""
    scale_f = 0.25
    sw, sh = int(W * scale_f), int(H * scale_f)
    ga = cv2.cvtColor(cv2.resize(img_a.astype(np.uint8), (sw, sh)), cv2.COLOR_RGB2GRAY)
    gb = cv2.cvtColor(cv2.resize(img_b.astype(np.uint8), (sw, sh)), cv2.COLOR_RGB2GRAY)
    flow_ab = cv2.calcOpticalFlowFarneback(ga, gb, None, 0.5, 3, 21, 3, 7, 1.5, 0)
    flow_ba = cv2.calcOpticalFlowFarneback(gb, ga, None, 0.5, 3, 21, 3, 7, 1.5, 0)
    flow_ab = cv2.resize(flow_ab, (W, H), interpolation=cv2.INTER_LINEAR) / scale_f
    flow_ba = cv2.resize(flow_ba, (W, H), interpolation=cv2.INTER_LINEAR) / scale_f
    return flow_ab, flow_ba


GRID_X, GRID_Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))


def morph_frames(img_a: np.ndarray, img_b: np.ndarray, flow_ab, flow_ba, alpha: float, flow_strength: float = 0.45) -> np.ndarray:
    """Smooth cosine-eased optical-flow morph + subtle golden rack-focus bloom at midpoint."""
    s = 0.5 - 0.5 * math.cos(math.pi * np.clip(alpha, 0.0, 1.0))
    map_ax = GRID_X - s * flow_strength * flow_ab[..., 0]
    map_ay = GRID_Y - s * flow_strength * flow_ab[..., 1]
    map_bx = GRID_X - (1.0 - s) * flow_strength * flow_ba[..., 0]
    map_by = GRID_Y - (1.0 - s) * flow_strength * flow_ba[..., 1]

    wa = cv2.remap(img_a, map_ax, map_ay, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    wb = cv2.remap(img_b, map_bx, map_by, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)
    blended = (1.0 - s) * wa + s * wb

    # Add a subtle cinematic golden rack-focus glow peaking at s=0.5
    mid = math.sin(math.pi * s)
    if mid > 0.02:
        small = cv2.resize(blended, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        blur = cv2.GaussianBlur(small, (0, 0), sigmaX=6.0)
        blur_up = cv2.resize(blur, (W, H), interpolation=cv2.INTER_LINEAR)
        # Warm champagne tint on highlights
        highlights = np.clip((blur_up - 140.0) / 115.0, 0.0, 1.0)
        warm_glow = highlights * np.array([255.0, 222.0, 165.0], dtype=np.float32)
        blended = blended * (1.0 - 0.14 * mid) + blur_up * (0.14 * mid) + warm_glow * (0.18 * mid)

    return np.clip(blended, 0.0, 255.0)


# ---------------------------------------------------------
# 3. SPECULAR STAR-FILTER GLINTS ON PEARL BEADS & BOKEH
# ---------------------------------------------------------
def draw_star_glint(canvas: np.ndarray, cx: int, cy: int, radius: float, intensity: float):
    """Draw a 4-point luxury camera star-filter glint on bright pearl facets."""
    if intensity <= 0.02 or radius < 4:
        return
    r = int(radius)
    x0, x1 = max(0, cx - r), min(W, cx + r + 1)
    y0, y1 = max(0, cy - r), min(H, cy + r + 1)
    if x1 <= x0 or y1 <= y0:
        return
    yy, xx = np.ogrid[y0:y1, x0:x1]
    dx = xx - cx
    dy = yy - cy
    dist = np.sqrt(dx * dx + dy * dy) + 1e-4
    # Horizontal + vertical thin spikes + soft core
    spike_h = np.exp(-np.abs(dy) * 0.45) * np.exp(-np.abs(dx) / (radius * 0.42))
    spike_v = np.exp(-np.abs(dx) * 0.45) * np.exp(-np.abs(dy) / (radius * 0.42))
    # Diagonal soft spikes
    d1 = np.abs(dx - dy) * 0.707
    d2 = np.abs(dx + dy) * 0.707
    spike_d = (np.exp(-d1 * 0.7) + np.exp(-d2 * 0.7)) * np.exp(-dist / (radius * 0.25)) * 0.45
    core = np.exp(-(dist * dist) / (2.0 * (radius * 0.12) ** 2))
    mask = np.clip((spike_h + spike_v + spike_d + core) * intensity, 0.0, 1.0)[..., None]
    color = np.array([255.0, 244.0, 218.0], dtype=np.float32)
    canvas[y0:y1, x0:x1] = np.clip(canvas[y0:y1, x0:x1] + mask * color * 0.85, 0.0, 255.0)


# Pre-define organic floating golden dust bokeh particles
RNG = np.random.default_rng(108)
PARTICLES = [
    {
        "x0": RNG.uniform(0.06, 0.94) * W,
        "y0": RNG.uniform(0.08, 0.92) * H,
        "vx": RNG.uniform(-9.0, 9.0),
        "vy": RNG.uniform(-22.0, -7.0),
        "r": RNG.uniform(3.0, 14.0),
        "phase": RNG.uniform(0, 2 * math.pi),
        "freq": RNG.uniform(1.2, 2.8),
        "alpha": RNG.uniform(0.12, 0.38),
    }
    for _ in range(38)
]


def add_cinematic_finish(frame: np.ndarray, t_sec: float, glint_centers: list) -> np.ndarray:
    """Apply floating golden bokeh particles, pearl star-glints, and subtle anamorphic vignette."""
    out = frame.copy()

    # 1) Floating golden dust particles
    for p in PARTICLES:
        px = (p["x0"] + p["vx"] * t_sec + 14.0 * math.sin(t_sec * 0.8 + p["phase"])) % W
        py = (p["y0"] + p["vy"] * t_sec) % H
        twinkle = 0.55 + 0.45 * math.sin(t_sec * p["freq"] + p["phase"])
        a = p["alpha"] * twinkle
        r = int(p["r"])
        icx, icy = int(px), int(py)
        x0, x1 = max(0, icx - r * 2), min(W, icx + r * 2 + 1)
        y0, y1 = max(0, icy - r * 2), min(H, icy + r * 2 + 1)
        if x1 > x0 and y1 > y0:
            yy, xx = np.ogrid[y0:y1, x0:x1]
            d2 = (xx - px) ** 2 + (yy - py) ** 2
            g = np.exp(-d2 / (2.0 * (p["r"] * 0.65) ** 2))[..., None] * a
            gold = np.array([255.0, 224.0, 162.0], dtype=np.float32)
            out[y0:y1, x0:x1] = np.clip(out[y0:y1, x0:x1] + g * gold, 0.0, 255.0)

    # 2) Star-filter glints on the pearl beads
    for idx, (gx, gy, base_r) in enumerate(glint_centers):
        pulse = max(0.0, math.sin(t_sec * 2.6 + idx * 1.35)) ** 2
        draw_star_glint(out, int(gx), int(gy), base_r, 0.72 * pulse)

    # 3) Subtle luxury cinema vignette
    return out


# Precompute vignette mask once
VY, VX = np.ogrid[:H, :W]
VNORM = ((VX - W * 0.5) / (W * 0.55)) ** 2 + ((VY - H * 0.5) / (H * 0.58)) ** 2
VIGNETTE_MASK = np.clip(1.0 - 0.24 * (VNORM ** 1.35), 0.68, 1.0)[..., None].astype(np.float32)


def find_pearl_glints(img: np.ndarray, max_pts: int = 7) -> list:
    """Find bright pearl facet highlights in the central product region (x: 20%..80%, y: 20%..78%)."""
    gray = cv2.cvtColor(img.astype(np.uint8), cv2.COLOR_RGB2GRAY)
    mask = np.zeros_like(gray)
    mask[int(H * 0.20):int(H * 0.78), int(W * 0.20):int(W * 0.80)] = 255
    masked = cv2.bitwise_and(gray, mask)
    pts = []
    temp = masked.copy()
    for i in range(max_pts):
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(temp)
        if max_val < 225:
            break
        mx, my = max_loc
        pts.append((mx, my, 24.0 + (i % 3) * 8.0))
        cv2.circle(temp, (mx, my), 65, 0, -1)
    return pts


# ---------------------------------------------------------
# 4. MINIMALIST LUXURY "AURALIS" FINALE BRAND OVERLAY
# ---------------------------------------------------------
FONT_CINZEL = ImageFont.truetype("assets/fonts/cinzel-latin-700-normal.woff", 84)
FONT_CINZEL_SUB = ImageFont.truetype("assets/fonts/cinzel-latin-500-normal.woff", 26)
FONT_CORMORANT = ImageFont.truetype("assets/fonts/cormorant-garamond-latin-600-italic.woff", 34)
FONT_VAZIR_LIGHT = ImageFont.truetype("assets/fonts/Vazirmatn-Light.ttf", 30)


def render_auralis_finale_overlay(frame_rgb: np.ndarray, t_sec: float) -> np.ndarray:
    """
    Render the minimalist luxury AURALIS logo & pearl emblem in the final shot (15.6s - 19.5s).
    Zero text appears before 15.6s, matching the user's choice of purely cinematic storytelling + final logo.
    """
    if t_sec < 15.6:
        return frame_rgb

    prog = np.clip((t_sec - 15.6) / 1.4, 0.0, 1.0)
    ease = 0.5 - 0.5 * math.cos(math.pi * prog)

    # Gently darken top and bottom regions so the champagne-gold AURALIS logo floats majestically
    grad = np.ones((H, 1, 1), dtype=np.float32)
    y_norm = np.linspace(0.0, 1.0, H)[:, None, None]
    top_darken = 1.0 - 0.48 * ease * np.clip(1.0 - y_norm / 0.34, 0.0, 1.0) ** 1.4
    bot_darken = 1.0 - 0.55 * ease * np.clip((y_norm - 0.68) / 0.32, 0.0, 1.0) ** 1.4
    out = frame_rgb * top_darken * bot_darken

    # Create RGBA overlay for crisp typography & pearl crest
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    alpha_main = int(255 * ease)
    alpha_sub = int(235 * np.clip((t_sec - 16.2) / 1.2, 0.0, 1.0))

    gold_bright = (246, 224, 178, alpha_main)
    gold_soft = (218, 190, 138, alpha_sub)
    pearl_white = (252, 248, 240, alpha_main)

    # Top emblem + AURALIS logotype positioned in the upper negative space (y ~ 115..255)
    y_slide = int((1.0 - ease) * 18.0)
    crest_y = 115 + y_slide

    # Draw delicate luxury pearl-shell crown emblem above AURALIS
    cx = W // 2
    for angle_deg, rad_len in [(-50, 26), (-25, 34), (0, 40), (25, 34), (50, 26)]:
        ang = math.radians(angle_deg - 90)
        x1 = cx + math.cos(ang) * 12
        y1 = crest_y + math.sin(ang) * 12
        x2 = cx + math.cos(ang) * rad_len
        y2 = crest_y + math.sin(ang) * rad_len
        draw.line([(x1, y1), (x2, y2)], fill=gold_soft, width=2)
        draw.ellipse([x2 - 3.5, y2 - 3.5, x2 + 3.5, y2 + 3.5], fill=pearl_white)
    # Central pearl at base of crest
    draw.ellipse([cx - 6, crest_y - 6, cx + 6, crest_y + 6], fill=pearl_white)

    # Brand Name: A U R A L I S
    logo_y = 196 + y_slide
    # Soft drop shadow
    draw.text((cx, logo_y + 3), "A U R A L I S", font=FONT_CINZEL, fill=(0, 0, 0, int(alpha_main * 0.65)), anchor="mm")
    draw.text((cx, logo_y), "A U R A L I S", font=FONT_CINZEL, fill=gold_bright, anchor="mm")

    # Delicate horizontal divider lines with central diamond
    if alpha_sub > 5:
        line_y = 254 + y_slide
        line_w = int(170 * (alpha_sub / 235.0))
        draw.line([(cx - line_w - 22, line_y), (cx - 18, line_y)], fill=gold_soft, width=1)
        draw.line([(cx + 18, line_y), (cx + line_w + 22, line_y)], fill=gold_soft, width=1)
        draw.polygon([(cx, line_y - 5), (cx + 5, line_y), (cx, line_y + 5), (cx - 5, line_y)], fill=gold_bright)

        # Bottom subtle signature in negative space below the pedestal
        bot_y = 1695 - int((1.0 - (alpha_sub / 235.0)) * 12)
        draw.text(
            (cx, bot_y),
            "H A N D C R A F T E D   P E A R L   B O X",
            font=FONT_CINZEL_SUB,
            fill=gold_soft,
            anchor="mm",
        )
        fa_sub = shape_fa("جعبه مرواریدی دست‌ساز")
        draw.text(
            (cx, bot_y + 54),
            fa_sub,
            font=FONT_VAZIR_LIGHT,
            fill=(238, 226, 205, int(alpha_sub * 0.92)),
            anchor="mm",
        )

    # Add a subtle animated golden light-sheen across the AURALIS letters
    sheen_prog = (t_sec - 16.0) / 2.2
    if 0.0 <= sheen_prog <= 1.2:
        ov_np = np.asarray(overlay, dtype=np.float32)
        sheen_x = W * (0.2 + 0.6 * sheen_prog)
        xs = np.arange(W, dtype=np.float32)[None, :, None]
        sheen_band = np.exp(-((xs - sheen_x) ** 2) / (2.0 * 65.0 ** 2))
        # Apply sheen only to upper logo area
        ov_np[130:280, :, :3] = np.clip(
            ov_np[130:280, :, :3] + sheen_band * 55.0 * (ov_np[130:280, :, 3:4] / 255.0),
            0.0,
            255.0,
        )
    else:
        ov_np = np.asarray(overlay, dtype=np.float32)

    alpha_f = ov_np[:, :, 3:4] / 255.0
    comp = out * (1.0 - alpha_f) + ov_np[:, :, :3] * alpha_f
    return np.clip(comp, 0.0, 255.0)


# ---------------------------------------------------------
# 5. ASSEMBLE THE 9-STAGE CONTINUOUS CINEMATIC TIMELINE
# ---------------------------------------------------------
def main():
    wav_path = "output/auralis_soundtrack.wav"
    generate_audio(wav_path)

    # Load our 8 sequential cinematic keyframes (all preserving the exact handmade pearl box)
    shot_paths = [
        "assets/generated/auralis_studio_dark.png",          # 0: Empty open handmade pearl box on dark marble
        "assets/generated/scene2_placing_ring_1.png",        # 1: Hands bringing solitaire ring into open pearl box
        "assets/generated/scene2_placing_ring_2.png",        # 2: Fingers pressing ring into black velvet cushion
        "assets/generated/scene3_closing_lid_1.png",         # 3: Hands lowering woven pearl dome lid halfway
        "assets/generated/scene3_closing_lid_2.png",         # 4: Woven pearl lid closed onto base, fingers resting on top
        "assets/generated/scene4_proposal_holding_closed.png", # 5: Proposal candlelight: hands holding closed pearl box
        "assets/generated/scene5_proposal_opening_half.png", # 6: Proposal: lifting woven pearl lid halfway open (golden glint)
        "assets/generated/scene5_proposal_opened_full.png",  # 7: Proposal: hands presenting fully open pearl box
        "assets/generated/scene6_hero_finale.png",           # 8: Hero pedestal shot + AURALIS luxury logo finale
    ]

    shots = [load_and_fit(p) for p in shot_paths]
    glints = [find_pearl_glints(s) for s in shots]

    # Precompute bidirectional optical flows between consecutive shots for fluid motion morphing
    flows = []
    for i in range(len(shots) - 1):
        print(f"Computing optical flow transition {i} -> {i+1} ...")
        flows.append(compute_flow_pair(shots[i], shots[i + 1]))

    # Timeline segments: (start_sec, end_sec, shot_idx, zoom_start, zoom_end, pan_x_end, pan_y_end)
    # With smooth 0.75s optical-flow morph transitions between consecutive shots!
    segments = [
        (0.0,  2.1,  0, 1.00, 1.05,  0.0, -10.0),  # 0: Open empty pearl box macro push-in
        (2.1,  4.1,  1, 1.02, 1.06, -6.0,  -6.0),  # 1: Hands bringing ring to box
        (4.1,  6.2,  2, 1.03, 1.07,  4.0,  -8.0),  # 2: Placing ring into velvet slot
        (6.2,  8.2,  3, 1.01, 1.05,  0.0,   8.0),  # 3: Lowering pearl dome lid halfway
        (8.2,  10.2, 4, 1.04, 1.00,  0.0,  10.0),  # 4: Pearl box completely closed
        (10.2, 12.1, 5, 1.00, 1.05,  0.0,  -8.0),  # 5: Proposal candlelight - holding closed pearl box
        (12.1, 14.1, 6, 1.02, 1.07,  0.0, -14.0),  # 6: Proposal - slowly lifting pearl lid open
        (14.1, 16.0, 7, 1.03, 1.08,  0.0, -10.0),  # 7: Proposal - fully open pearl box presented in hands
        (16.0, 19.5, 8, 1.06, 1.00,  0.0,   0.0),  # 8: Hero pedestal finale + AURALIS logo reveal
    ]
    trans_half = 0.38  # 0.76s total optical-flow morph window around each boundary

    def eval_shot_at(seg_idx: int, t_sec: float) -> np.ndarray:
        s0, s1, idx, z0, z1, px, py = segments[seg_idx]
        u = np.clip((t_sec - s0) / max(0.01, (s1 - s0)), 0.0, 1.0)
        u_ease = 0.5 - 0.5 * math.cos(math.pi * u)
        scale = z0 + (z1 - z0) * u_ease
        dx = px * u_ease
        dy = py * u_ease
        return zoom_pan(shots[idx], scale, dx, dy)

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    temp_mp4 = "output/auralis_video_only.mp4"
    final_mp4 = "Auralis_Handmade_Pearl_Box_Viral.mp4"

    cmd_encode = [
        ffmpeg_exe, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{W}x{H}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "17",
        "-pix_fmt", "yuv420p",
        temp_mp4,
    ]
    proc = subprocess.Popen(cmd_encode, stdin=subprocess.PIPE)

    for f_idx in range(TOTAL_FRAMES):
        t_sec = f_idx / FPS

        # Determine active segment
        seg_i = len(segments) - 1
        for i, (s0, s1, *_) in enumerate(segments):
            if t_sec < s1 or i == len(segments) - 1:
                seg_i = i
                break

        s0, s1, shot_idx, *_ = segments[seg_i]

        # Check if we are in the transition window toward the next segment
        if seg_i < len(segments) - 1 and (t_sec >= s1 - trans_half):
            alpha = (t_sec - (s1 - trans_half)) / (2.0 * trans_half)
            img_a = eval_shot_at(seg_i, t_sec)
            img_b = eval_shot_at(seg_i + 1, t_sec)
            flow_ab, flow_ba = flows[seg_i]
            # Use stronger optical flow warp for same-scene hand/lid movements, softer for scene change (4->5)
            f_str = 0.18 if seg_i == 4 else 0.42
            frame = morph_frames(img_a, img_b, flow_ab, flow_ba, alpha, flow_strength=f_str)
            active_glints = glints[shot_idx]
        elif seg_i > 0 and (t_sec < s0 + trans_half):
            alpha = (t_sec - (s0 - trans_half)) / (2.0 * trans_half)
            img_a = eval_shot_at(seg_i - 1, t_sec)
            img_b = eval_shot_at(seg_i, t_sec)
            flow_ab, flow_ba = flows[seg_i - 1]
            f_str = 0.18 if (seg_i - 1) == 4 else 0.42
            frame = morph_frames(img_a, img_b, flow_ab, flow_ba, alpha, flow_strength=f_str)
            active_glints = glints[shot_idx]
        else:
            frame = eval_shot_at(seg_i, t_sec)
            active_glints = glints[shot_idx]

        # Add pearl star-filter glints + floating golden bokeh
        frame = add_cinematic_finish(frame, t_sec, active_glints)
        frame = frame * VIGNETTE_MASK

        # Fade in from black during first 0.55s, and gentle fade at very end
        if t_sec < 0.55:
            frame *= (t_sec / 0.55)

        # Render AURALIS minimalist brand finale in the final shot
        frame = render_auralis_finale_overlay(frame, t_sec)

        out_u8 = np.clip(frame, 0, 255).astype(np.uint8)
        proc.stdin.write(out_u8.tobytes())

        # Save verification preview frames
        if f_idx in [25, 100, 155, 220, 275, 335, 395, 450, 535]:
            Image.fromarray(out_u8).save(f"output/preview_frame_{f_idx:03d}.jpg", quality=92)

    proc.stdin.close()
    proc.wait()

    # Mux video + stereo soundtrack into final MP4
    cmd_mux = [
        ffmpeg_exe, "-y",
        "-i", temp_mp4,
        "-i", wav_path,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "320k",
        "-movflags", "+faststart",
        "-shortest",
        final_mp4,
    ]
    subprocess.run(cmd_mux, check=True)
    print("Successfully built final video:", final_mp4)


if __name__ == "__main__":
    main()
