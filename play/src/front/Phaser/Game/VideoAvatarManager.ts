import { VideoAvatarRenderer } from "../Entity/VideoAvatarRenderer";
import type { GameScene } from "./GameScene";

/**
 * VideoAvatarManager coordinates video avatar rendering for all players in the scene.
 * It manages the lifecycle of VideoAvatarRenderer instances for both local and remote players.
 */
export class VideoAvatarManager {
    private scene: GameScene;
    private renderers: Map<string, VideoAvatarRenderer> = new Map();
    private localRenderer: VideoAvatarRenderer | null = null;
    private readonly MAX_CONCURRENT_VIDEO = 8;
    private destroyed = false;

    constructor(scene: GameScene) {
        this.scene = scene;
    }

    /**
     * Create the renderer for the local player
     */
    createLocalRenderer(): VideoAvatarRenderer {
        if (this.localRenderer) {
            return this.localRenderer;
        }

        this.localRenderer = new VideoAvatarRenderer(this.scene, "local_video_avatar");
        return this.localRenderer;
    }

    /**
     * Get the local player's renderer
     */
    getLocalRenderer(): VideoAvatarRenderer | null {
        return this.localRenderer;
    }

    /**
     * Create a renderer for a remote player
     */
    createRemoteRenderer(spaceUserId: string): VideoAvatarRenderer {
        // Check if renderer already exists
        const existing = this.renderers.get(spaceUserId);
        if (existing) {
            return existing;
        }

        // Check concurrent video limit
        if (this.renderers.size >= this.MAX_CONCURRENT_VIDEO) {
            console.warn(`Maximum concurrent video avatars (${this.MAX_CONCURRENT_VIDEO}) reached`);
        }

        const textureKey = `remote_video_${spaceUserId}`;
        const renderer = new VideoAvatarRenderer(this.scene, textureKey);
        this.renderers.set(spaceUserId, renderer);
        return renderer;
    }

    /**
     * Get a remote player's renderer
     */
    getRenderer(spaceUserId: string): VideoAvatarRenderer | undefined {
        return this.renderers.get(spaceUserId);
    }

    /**
     * Get or create a renderer for a remote player
     */
    getOrCreateRenderer(spaceUserId: string): VideoAvatarRenderer {
        const existing = this.renderers.get(spaceUserId);
        if (existing) {
            return existing;
        }
        return this.createRemoteRenderer(spaceUserId);
    }

    /**
     * Update all renderers - call from scene update loop
     */
    update(time: number): void {
        if (this.destroyed) return;

        // Update local renderer
        this.localRenderer?.update(time);

        // Update remote renderers
        this.renderers.forEach((renderer) => {
            renderer.update(time);
        });
    }

    /**
     * Remove a remote player's renderer
     */
    removeRenderer(spaceUserId: string): void {
        const renderer = this.renderers.get(spaceUserId);
        if (renderer) {
            renderer.destroy();
            this.renderers.delete(spaceUserId);
        }
    }

    /**
     * Get count of active video renderers
     */
    getActiveVideoCount(): number {
        let count = this.localRenderer?.isVideoActive() ? 1 : 0;
        this.renderers.forEach((renderer) => {
            if (renderer.isVideoActive()) {
                count++;
            }
        });
        return count;
    }

    /**
     * Check if we can add more video streams (within limit)
     */
    canAddVideoStream(): boolean {
        return this.getActiveVideoCount() < this.MAX_CONCURRENT_VIDEO;
    }

    /**
     * Get all renderer texture keys (for debugging)
     */
    getAllTextureKeys(): string[] {
        const keys: string[] = [];
        if (this.localRenderer) {
            keys.push(this.localRenderer.getTextureKey());
        }
        this.renderers.forEach((renderer) => {
            keys.push(renderer.getTextureKey());
        });
        return keys;
    }

    /**
     * Clean up all resources
     */
    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;

        // Destroy local renderer
        this.localRenderer?.destroy();
        this.localRenderer = null;

        // Destroy all remote renderers
        this.renderers.forEach((renderer) => {
            renderer.destroy();
        });
        this.renderers.clear();
    }
}
