import { writable, derived } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";

export type AvatarMode = "video" | "mask";

// Default mask images available in the gallery
export const DEFAULT_MASKS = [
    { id: "default-silhouette", url: "/resources/masks/default-silhouette.svg", name: "Silhouette" },
    { id: "avatar-1", url: "/resources/masks/avatar-1.svg", name: "Avatar 1" },
    { id: "avatar-2", url: "/resources/masks/avatar-2.svg", name: "Avatar 2" },
    { id: "avatar-3", url: "/resources/masks/avatar-3.svg", name: "Avatar 3" },
    { id: "avatar-4", url: "/resources/masks/avatar-4.svg", name: "Avatar 4" },
    { id: "avatar-5", url: "/resources/masks/avatar-5.svg", name: "Avatar 5" },
    { id: "avatar-6", url: "/resources/masks/avatar-6.svg", name: "Avatar 6" },
    { id: "anonymous", url: "/resources/masks/anonymous.svg", name: "Anonymous" },
];

/**
 * Store for the current avatar mode (video or mask)
 */
function createAvatarModeStore() {
    const { subscribe, set, update } = writable<AvatarMode>(localUserStore.getAvatarMode());

    return {
        subscribe,
        setMode: (mode: AvatarMode) => {
            set(mode);
            localUserStore.setAvatarMode(mode);
        },
        toggleMode: () => {
            update((current) => {
                const newMode = current === "video" ? "mask" : "video";
                localUserStore.setAvatarMode(newMode);
                return newMode;
            });
        },
    };
}

/**
 * Store for the currently selected mask image URL
 */
function createMaskImageStore() {
    const savedMask = localUserStore.getMaskImage();
    const { subscribe, set } = writable<string | null>(savedMask || DEFAULT_MASKS[0].url);

    return {
        subscribe,
        setMaskImage: (imageUrl: string | null) => {
            set(imageUrl);
            localUserStore.setMaskImage(imageUrl);
        },
        setCustomMask: (dataUrl: string) => {
            set(dataUrl);
            localUserStore.setMaskImage(dataUrl);
        },
    };
}

export const avatarModeStore = createAvatarModeStore();
export const maskImageStore = createMaskImageStore();

/**
 * Derived store that indicates if video should be shown
 * (avatar mode is video AND we have an active stream)
 */
export const shouldShowVideoStore = derived(avatarModeStore, ($avatarMode) => $avatarMode === "video");

/**
 * Derived store for the current mask URL to use when in mask mode
 */
export const currentMaskUrlStore = derived([avatarModeStore, maskImageStore], ([$avatarMode, $maskImage]) => {
    if ($avatarMode === "video") {
        return null;
    }
    return $maskImage || DEFAULT_MASKS[0].url;
});
