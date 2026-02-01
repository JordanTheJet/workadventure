<script lang="ts">
    import { DEFAULT_MASKS, maskImageStore } from "../../Stores/AvatarModeStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { IconCheck, IconCloudUpload } from "@wa-icons";

    let fileInput: HTMLInputElement;
    let customMaskPreview: string | null = null;

    $: selectedMask = $maskImageStore;
    $: isCustomMask = selectedMask && !DEFAULT_MASKS.some((m) => m.url === selectedMask);

    function selectMask(url: string) {
        maskImageStore.setMaskImage(url);
    }

    function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            console.warn("Invalid file type. Please select an image.");
            return;
        }

        // Validate file size (max 100KB as per plan)
        if (file.size > 100 * 1024) {
            console.warn("File too large. Please select an image under 100KB.");
            return;
        }

        // Read and resize image
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize image to max 64x64 for storage efficiency
                const canvas = document.createElement("canvas");
                const maxSize = 64;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL("image/png");
                    customMaskPreview = dataUrl;
                    maskImageStore.setCustomMask(dataUrl);
                }
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }

    function triggerFileUpload() {
        fileInput.click();
    }
</script>

<div class="flex flex-col gap-3 p-2">
    <!-- Preset Masks Section -->
    <div class="flex flex-col gap-2">
        <h3 class="text-sm font-medium text-white/80">{$LL.actionbar.avatarMode.presetMasks()}</h3>
        <div class="grid grid-cols-4 gap-2">
            {#each DEFAULT_MASKS as mask (mask.id)}
                {@const isSelected = selectedMask === mask.url}
                <button
                    class="relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:brightness-110
                        {isSelected ? 'border-white' : 'border-transparent hover:border-white/30'}"
                    on:click={() => selectMask(mask.url)}
                    title={mask.name}
                >
                    <img src={mask.url} alt={mask.name} class="w-full h-full object-cover bg-contrast/50" />
                    {#if isSelected}
                        <div class="absolute inset-0 flex items-center justify-center bg-black/50">
                            <IconCheck class="w-5 h-5 text-white" />
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>

    <!-- Custom Mask Section -->
    <div class="flex flex-col gap-2">
        <h3 class="text-sm font-medium text-white/80">{$LL.actionbar.avatarMode.customMask()}</h3>
        <div class="flex gap-2 items-center">
            <button
                class="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-sm"
                on:click={triggerFileUpload}
            >
                <IconCloudUpload class="w-4 h-4" />
                <span>{$LL.actionbar.avatarMode.uploadCustomMask()}</span>
            </button>
            <input bind:this={fileInput} type="file" accept="image/*" class="hidden" on:change={handleFileSelect} />
            {#if customMaskPreview || isCustomMask}
                <div
                    class="relative w-10 h-10 rounded-lg overflow-hidden border-2
                        {isCustomMask ? 'border-white' : 'border-transparent'}"
                >
                    <img
                        src={customMaskPreview || selectedMask}
                        alt="Custom mask"
                        class="w-full h-full object-cover bg-contrast/50"
                    />
                    {#if isCustomMask}
                        <div class="absolute inset-0 flex items-center justify-center bg-black/50">
                            <IconCheck class="w-3 h-3 text-white" />
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>
