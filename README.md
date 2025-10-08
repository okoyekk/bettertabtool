# BetterTabTool

<a href="url"><img src="./src/assets/icon-512.png" align="center" height="100" width="100" ></a>

## Setup Instructions (Prebuilt Packages)
- Install via the [Chrome Web Store(CWS)](https://chromewebstore.google.com/detail/bettertabtool/gokjffmakbnlklbkhegcmldmahhafknc)
- Sometimes the CWS verison is older than the latest version on the [Releases page](https://github.com/okoyekk/bettertabtool/releases) since it takes a few days for a new version to get approved. If this is the case, you can install the latest CRX file from the Releases page by:
    -  Navigating to `chrome://extensions`
    -  Downloading and extracting the CRX file from the zip then dragging it into the page
    -  However, this only works if you have installed this extension from the Chrome Web Store previously due to security concerns

## Setup Instructions (Manual Build)

-   Clone the repo
-   Run `npm run build` from the repo
    -   This generates extension files in `./dist/`
-   Open Chrome and navigate to `chrome://extensions`
-   Turn on developer mode toggle (top right corner)
-   Click "Load unpacked" and select the dist folder that was just generated

## Development Instructions

-   Complete setup above and ensure the extension is loaded
-   Make some changes...
-   Run `npm run build` from the repo
-   Open Chrome and navigate to `chrome://extensions`
-   Either add the extension through "Load unpacked" or click the reload button on the existing extension

## Screenshots

Light mode popup
<a href="url"><img src="./media/popup-light.png" align="center"></a>
Dark mode popup
<a href="url"><img src="./media/popup-dark.png" align="center"></a>
Open link in Specific Window
<a href="url"><img src="./media/open-link-in-window.png" align="center"></a>

### Default Keybinds

<a href="url"><img src="./media/default-keybinds.png" align="center"></a>
To set custom keybinds or unset default keybinds, visit chrome://extensions/shortcuts
