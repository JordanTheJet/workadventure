import type { GameScene } from "../Game/GameScene";

/**
 * VideoAvatarRenderer renders video frames or mask images to a Phaser CanvasTexture
 * as a rectangular sprite that can be used in place of the traditional Woka character.
 */
export class VideoAvatarRenderer {
    private scene: GameScene;
    private canvasTexture: Phaser.Textures.CanvasTexture;
    private videoElement: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastFrameTime = 0;
    private frameInterval = 66; // ~15fps for performance
    private isActive = false;
    private currentMaskImage: HTMLImageElement | null = null;
    private maskLoading = false;
    private destroyed = false;
    private textureKey: string;

    // Sprite dimensions - matching character sprite size
    private static readonly SPRITE_WIDTH = 32;
    private static readonly SPRITE_HEIGHT = 32;

    constructor(scene: GameScene, textureKey: string) {
        this.scene = scene;
        this.textureKey = textureKey;

        // Create canvas for rendering
        this.canvas = document.createElement("canvas");
        this.canvas.width = VideoAvatarRenderer.SPRITE_WIDTH;
        this.canvas.height = VideoAvatarRenderer.SPRITE_HEIGHT;
        const ctx = this.canvas.getContext("2d");
        if (!ctx) {
            throw new Error("Failed to get 2d context for video avatar canvas");
        }
        this.ctx = ctx;

        // Create Phaser canvas texture
        const canvasTexture = scene.textures.createCanvas(
            textureKey,
            VideoAvatarRenderer.SPRITE_WIDTH,
            VideoAvatarRenderer.SPRITE_HEIGHT
        );
        if (!canvasTexture) {
            throw new Error("Failed to create canvas texture for video avatar");
        }
        this.canvasTexture = canvasTexture;

        // Create hidden video element for frame extraction
        this.videoElement = document.createElement("video");
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;

        // Initialize with a default placeholder
        this.drawPlaceholder();
    }

    /**
     * Set the video stream to render
     */
    setStream(stream: MediaStream | undefined): void {
        if (this.destroyed) return;

        if (stream && stream.getVideoTracks().length > 0) {
            this.videoElement.srcObject = stream;
            this.isActive = true;
            this.videoElement.play().catch((e) => {
                console.warn("Failed to play video stream:", e);
            });
        } else {
            this.videoElement.srcObject = null;
            this.isActive = false;
            // Draw current mask if available, otherwise placeholder
            if (this.currentMaskImage) {
                this.drawMaskToCanvas();
            } else {
                this.drawPlaceholder();
            }
        }
    }

    /**
     * Set a mask image to display when video is not active
     */
    setMaskImage(imageUrl: string | null): void {
        if (this.destroyed) return;

        if (!imageUrl) {
            this.currentMaskImage = null;
            if (!this.isActive) {
                this.drawPlaceholder();
            }
            return;
        }

        this.maskLoading = true;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            if (this.destroyed) return;
            this.currentMaskImage = img;
            this.maskLoading = false;
            // If video is not active, draw the mask
            if (!this.isActive) {
                this.drawMaskToCanvas();
            }
        };
        img.onerror = () => {
            console.warn("Failed to load mask image:", imageUrl);
            this.maskLoading = false;
            if (!this.isActive) {
                this.drawPlaceholder();
            }
        };
        img.src = imageUrl;
    }

    /**
     * Update the renderer - call this from scene update loop
     */
    update(time: number): void {
        if (this.destroyed) return;
        if (!this.isActive) return;

        // Throttle frame updates for performance
        if (time - this.lastFrameTime < this.frameInterval) return;
        this.lastFrameTime = time;

        // Check if video has valid dimensions
        if (this.videoElement.videoWidth === 0 || this.videoElement.videoHeight === 0) {
            return;
        }

        // Draw video frame to canvas
        this.drawVideoFrame();
    }

    /**
     * Draw the current video frame to the canvas
     */
    private drawVideoFrame(): void {
        const video = this.videoElement;
        const width = VideoAvatarRenderer.SPRITE_WIDTH;
        const height = VideoAvatarRenderer.SPRITE_HEIGHT;

        // Calculate source dimensions to maintain aspect ratio (center crop)
        const videoAspect = video.videoWidth / video.videoHeight;
        const targetAspect = width / height;

        let sx = 0;
        let sy = 0;
        let sw = video.videoWidth;
        let sh = video.videoHeight;

        if (videoAspect > targetAspect) {
            // Video is wider - crop sides
            sw = video.videoHeight * targetAspect;
            sx = (video.videoWidth - sw) / 2;
        } else {
            // Video is taller - crop top/bottom
            sh = video.videoWidth / targetAspect;
            sy = (video.videoHeight - sh) / 2;
        }

        // Clear and draw
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);

        // Refresh the Phaser texture
        this.refreshTexture();
    }

    /**
     * Draw the mask image to the canvas
     */
    private drawMaskToCanvas(): void {
        if (!this.currentMaskImage) {
            this.drawPlaceholder();
            return;
        }

        const width = VideoAvatarRenderer.SPRITE_WIDTH;
        const height = VideoAvatarRenderer.SPRITE_HEIGHT;
        const img = this.currentMaskImage;

        // Calculate dimensions for center fit
        const imgAspect = img.width / img.height;
        const targetAspect = width / height;

        let dx = 0;
        let dy = 0;
        let dw = width;
        let dh = height;

        if (imgAspect > targetAspect) {
            // Image is wider
            dh = width / imgAspect;
            dy = (height - dh) / 2;
        } else {
            // Image is taller
            dw = height * imgAspect;
            dx = (width - dw) / 2;
        }

        // Clear and draw
        this.ctx.fillStyle = "#333333";
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.drawImage(img, dx, dy, dw, dh);

        // Refresh the Phaser texture
        this.refreshTexture();
    }

    /**
     * Draw a placeholder when no video or mask is available
     */
    private drawPlaceholder(): void {
        const width = VideoAvatarRenderer.SPRITE_WIDTH;
        const height = VideoAvatarRenderer.SPRITE_HEIGHT;

        // Draw a simple silhouette placeholder
        this.ctx.fillStyle = "#444444";
        this.ctx.fillRect(0, 0, width, height);

        // Draw a simple person silhouette
        this.ctx.fillStyle = "#666666";
        // Head
        this.ctx.beginPath();
        this.ctx.arc(width / 2, height * 0.35, height * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
        // Body
        this.ctx.beginPath();
        this.ctx.ellipse(width / 2, height * 0.8, width * 0.3, height * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Refresh the Phaser texture
        this.refreshTexture();
    }

    /**
     * Refresh the Phaser canvas texture with current canvas content
     */
    private refreshTexture(): void {
        if (this.destroyed) return;

        const context = this.canvasTexture.getContext();
        context.clearRect(0, 0, VideoAvatarRenderer.SPRITE_WIDTH, VideoAvatarRenderer.SPRITE_HEIGHT);
        context.drawImage(this.canvas, 0, 0);
        this.canvasTexture.refresh();
    }

    /**
     * Get the texture key for creating sprites
     */
    getTextureKey(): string {
        return this.textureKey;
    }

    /**
     * Check if video stream is currently active
     */
    isVideoActive(): boolean {
        return this.isActive;
    }

    /**
     * Check if mask is currently loading
     */
    isMaskLoading(): boolean {
        return this.maskLoading;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;

        this.videoElement.srcObject = null;
        this.videoElement.remove();
        this.isActive = false;
        this.currentMaskImage = null;

        // Destroy the Phaser texture if it exists
        if (this.scene.textures.exists(this.textureKey)) {
            this.canvasTexture.destroy();
        }
    }
}
