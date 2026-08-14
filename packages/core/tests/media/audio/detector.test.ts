import { describe, it, expect } from 'vitest';
import { detectFormatFromBase64, getMimeType, getFormatFromMimeType } from '../../../src/media/audio/index.js';

describe('Audio Format Detector', () => {
  describe('detectFormatFromBase64', () => {
    it('should detect WAV format', () => {
      // WAV magic bytes: RIFF....WAVE
      const wavHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // ChunkSize
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6d, 0x74, 0x20, // "fmt "
      ]);
      const base64 = wavHeader.toString('base64');
      
      expect(detectFormatFromBase64(base64)).toBe('wav');
    });

    it('should detect header-based formats from data URLs', () => {
      const fixtures = [
        {
          format: 'wav',
          base64: Buffer.from([
            0x52, 0x49, 0x46, 0x46,
            0x24, 0x00, 0x00, 0x00,
            0x57, 0x41, 0x56, 0x45,
            0x66, 0x6d, 0x74, 0x20,
          ]).toString('base64'),
        },
        {
          format: 'mp3',
          base64: Buffer.from([
            0x49, 0x44, 0x33,
            0x03, 0x00,
            0x00,
            0x00, 0x00, 0x00, 0x00,
          ]).toString('base64'),
        },
        {
          format: 'flac',
          base64: Buffer.from([
            0x66, 0x4c, 0x61, 0x43,
            0x00, 0x00, 0x00, 0x22,
          ]).toString('base64'),
        },
      ] as const;

      for (const fixture of fixtures) {
        expect(detectFormatFromBase64(`data:audio/${fixture.format};base64,${fixture.base64}`)).toBe(fixture.format);
      }
    });

    it('should detect MP3 format (ID3v2)', () => {
      // MP3 with ID3v2 tag: ID3
      const mp3Header = Buffer.from([
        0x49, 0x44, 0x33, // "ID3"
        0x03, 0x00, // Version 2.3
        0x00, // Flags
        0x00, 0x00, 0x00, 0x00, // Size
      ]);
      const base64 = mp3Header.toString('base64');
      
      expect(detectFormatFromBase64(base64)).toBe('mp3');
    });

    it('should detect MP3 format (MPEG frame sync)', () => {
      // MP3 MPEG frame sync: 0xFF 0xFB
      const mp3Frame = Buffer.from([
        0xff, 0xfb, 0x90, 0x00,
      ]);
      const base64 = mp3Frame.toString('base64');
      
      expect(detectFormatFromBase64(base64)).toBe('mp3');
    });

    it('should detect Opus format', () => {
      // Ogg container with OpusHead
      const opusHeader = Buffer.from([
        0x4f, 0x67, 0x67, 0x53, // "OggS"
        ...Array(24).fill(0), // Ogg page header padding
        0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64, // "OpusHead"
      ]);
      const base64 = opusHeader.toString('base64');
      
      expect(detectFormatFromBase64(base64)).toBe('opus');
    });

    it('should detect Opus format when OpusHead is not at a fixed offset', () => {
      const opusHeader = Buffer.from([
        0x4f, 0x67, 0x67, 0x53,
        ...Array(22).fill(0),
        0x02,
        0x08, 0x13,
        0x4f, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64,
      ]);
      const base64 = opusHeader.toString('base64');

      expect(detectFormatFromBase64(base64)).toBe('opus');
    });

    it('should detect FLAC format', () => {
      // FLAC magic: fLaC
      const flacHeader = Buffer.from([
        0x66, 0x4c, 0x61, 0x43, // "fLaC"
        0x00, 0x00, 0x00, 0x22, // Metadata block
      ]);
      const base64 = flacHeader.toString('base64');
      
      expect(detectFormatFromBase64(base64)).toBe('flac');
    });

    it('should default to PCM for raw data without header', () => {
      // Raw PCM data (no magic bytes)
      const rawPCM = Buffer.from([
        0x00, 0x00, 0x10, 0x20, 0x30, 0x40,
      ]);
      const base64 = rawPCM.toString('base64');
      
      expect(detectFormatFromBase64(base64)).toBe('pcm');
    });

    it('should handle empty data', () => {
      const empty = '';
      expect(detectFormatFromBase64(empty)).toBe('unknown');
    });

    it('should handle invalid base64', () => {
      const invalid = '!!!invalid base64!!!';
      expect(detectFormatFromBase64(invalid)).toBe('unknown');
    });

    it('should reject base64 payloads that are not plausible audio', () => {
      expect(detectFormatFromBase64('aGVsbG8=')).toBe('unknown');
      expect(detectFormatFromBase64('data:text/plain;base64,aGVsbG8=')).toBe('unknown');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for each format', () => {
      expect(getMimeType('pcm', 16000)).toBe('audio/pcm;rate=16000');
      expect(getMimeType('wav')).toBe('audio/wav');
      expect(getMimeType('mp3')).toBe('audio/mpeg');
      expect(getMimeType('opus')).toBe('audio/opus');
      expect(getMimeType('flac')).toBe('audio/flac');
      expect(getMimeType('webm')).toBe('audio/webm');
      expect(getMimeType('unknown')).toBe('application/octet-stream');
    });

    it('should handle PCM without sample rate', () => {
      expect(getMimeType('pcm')).toBe('audio/pcm');
    });
  });

  describe('getFormatFromMimeType', () => {
    it('should extract format from MIME type string', () => {
      expect(getFormatFromMimeType('audio/pcm;rate=16000')).toBe('pcm');
      expect(getFormatFromMimeType('audio/wav')).toBe('wav');
      expect(getFormatFromMimeType('audio/mpeg')).toBe('mp3');
      expect(getFormatFromMimeType('audio/mp3')).toBe('mp3');
      expect(getFormatFromMimeType('audio/opus')).toBe('opus');
      expect(getFormatFromMimeType('audio/ogg')).toBe('ogg');
      expect(getFormatFromMimeType('audio/flac')).toBe('flac');
      expect(getFormatFromMimeType('audio/webm')).toBe('webm');
    });

    it('should be case-insensitive', () => {
      expect(getFormatFromMimeType('AUDIO/WAV')).toBe('wav');
      expect(getFormatFromMimeType('Audio/Opus')).toBe('opus');
    });

    it('should return unknown for unsupported MIME types', () => {
      expect(getFormatFromMimeType('audio/aac')).toBe('unknown');
      expect(getFormatFromMimeType('video/mp4')).toBe('unknown');
      expect(getFormatFromMimeType('text/plain')).toBe('unknown');
    });
  });
});
