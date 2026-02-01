<script lang="ts">
    import { avatarModeStore } from "../../Stores/AvatarModeStore";
    import { requestedCameraState } from "../../Stores/MediaStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import ActionBarButton from "./ActionBarButton.svelte";
    import { IconCamera, IconUser } from "@wa-icons";

    function toggleAvatarMode() {
        if ($avatarModeStore === "video") {
            avatarModeStore.setMode("mask");
            requestedCameraState.disableWebcam();
        } else {
            avatarModeStore.setMode("video");
            requestedCameraState.enableWebcam();
        }
    }

    $: isVideoMode = $avatarModeStore === "video";
</script>

<ActionBarButton
    on:click={toggleAvatarMode}
    tooltipTitle={isVideoMode ? $LL.actionbar.avatarMode.switchToMask() : $LL.actionbar.avatarMode.enableCamera()}
    tooltipDesc={isVideoMode ? $LL.actionbar.avatarMode.maskDescription() : $LL.actionbar.avatarMode.videoDescription()}
    state={isVideoMode ? "active" : "normal"}
    dataTestId="avatar-mode-toggle"
>
    {#if isVideoMode}
        <IconCamera class="w-6 h-6" />
    {:else}
        <IconUser class="w-6 h-6" />
    {/if}
</ActionBarButton>
