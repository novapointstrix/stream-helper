// src/utils/wheelAudio.ts

class WheelAudio {
    private ctx: AudioContext | null = null;

    private getContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    // Приятный, глухой звук щелчка (как деревянный клик / сочный тач)
    playTick() {
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            // Синусоида дает мягкий, приятный гулкий клик без резкого треска
            osc.type = 'sine';
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.035);

            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.035);
        } catch (e) {
            console.error(e);
        }
    }

    // Мягкий гармоничный победный перезвон (Мажорный септаккорд Cmaj7)
    playWin() {
        try {
            const ctx = this.getContext();
            // C5, E5, G5, B5, C6 — сочное и не резкое звучание
            const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];

            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

                gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + idx * 0.08 + 0.06);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.8);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + idx * 0.08);
                osc.stop(ctx.currentTime + idx * 0.08 + 0.8);
            });
        } catch (e) {
            console.error(e);
        }
    }
}

export const wheelAudio = new WheelAudio();