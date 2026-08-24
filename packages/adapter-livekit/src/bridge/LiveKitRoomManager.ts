import type { OwlLayerBridgeSessionSnapshot } from './OwlLayerContextBridge.js';

export interface LiveKitRoomHandle {
  sessionId: string;
  roomName: string;
  agentIdentity: string;
  room?: unknown;
  metadata?: Record<string, unknown>;
  close?: () => Promise<void> | void;
}

export interface LiveKitRoomProvisionerInput {
  session: OwlLayerBridgeSessionSnapshot;
  roomName: string;
  agentIdentity: string;
}

export type LiveKitRoomProvisioner = (
  input: LiveKitRoomProvisionerInput
) => Promise<LiveKitRoomHandle> | LiveKitRoomHandle;

export interface LiveKitRoomManagerOptions {
  roomNamePrefix?: string;
  agentIdentityPrefix?: string;
  provisionRoom?: LiveKitRoomProvisioner;
}

export class LiveKitRoomManager {
  private readonly roomNamePrefix: string;
  private readonly agentIdentityPrefix: string;
  private readonly provisionRoom?: LiveKitRoomProvisioner;
  private readonly rooms = new Map<string, LiveKitRoomHandle>();

  constructor(options: LiveKitRoomManagerOptions = {}) {
    this.roomNamePrefix = options.roomNamePrefix ?? 'owllayer';
    this.agentIdentityPrefix = options.agentIdentityPrefix ?? 'owllayer-agent';
    this.provisionRoom = options.provisionRoom;
  }

  async getOrCreateRoom(session: OwlLayerBridgeSessionSnapshot): Promise<LiveKitRoomHandle> {
    const existing = this.rooms.get(session.sessionId);
    if (existing) {
      return existing;
    }

    const roomName = `${this.roomNamePrefix}-${session.sessionId}`;
    const agentIdentity = `${this.agentIdentityPrefix}-${session.sessionId}`;
    const handle = this.provisionRoom
      ? await this.provisionRoom({ session, roomName, agentIdentity })
      : {
          sessionId: session.sessionId,
          roomName,
          agentIdentity,
        };

    this.rooms.set(session.sessionId, handle);
    return handle;
  }

  getRoom(sessionId: string): LiveKitRoomHandle | undefined {
    return this.rooms.get(sessionId);
  }

  async closeRoom(sessionId: string): Promise<void> {
    const room = this.rooms.get(sessionId);
    if (!room) {
      return;
    }

    this.rooms.delete(sessionId);
    await room.close?.();
  }

  async closeAll(): Promise<void> {
    const sessionIds = Array.from(this.rooms.keys());
    await Promise.all(sessionIds.map((sessionId) => this.closeRoom(sessionId)));
  }
}
