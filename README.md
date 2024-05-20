## Project Title

Project Title
HLTE Browser Extension

##
## Overview

Overview
The HLTE Browser Extension is a comprehensive tool designed to enhance user browsing experience by allowing users to annotate media, perform searches, and customize their browsing behavior via a convenient context menu. This extension offers a seamless way to handle various tasks directly within the browser environment.

##
## Features

Features
- **Annotation of Media:** Users can annotate images and videos, providing contextual information and notes.
- **Customizable Search Popup:** A dedicated search popup to quickly search the web using customized templates.
- **Context Menu Integration:** Offers a context menu to perform actions like annotations and searches directly from the right-click menu.
- **Status Icon:** Visual status updates through icons.
- **Multi-browser Compatibility:** Supports multiple browsers including Firefox and Chrome.

##
## Installation Instructions

Installation Instructions
1. **Clone the Repository:**
   ```sh
   git clone https://github.com/hlte-net/extension.git
   cd extension
   ```

2. **Setup for Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable "Developer mode" by toggling the switch in the top right corner.
   - Click on "Load unpacked" and select the cloned `extension` directory.

3. **Setup for Firefox:**
   - Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
   - Click on "Load Temporary Add-on" and select the `manifest.json` file in the cloned `extension` directory.

##
## Usage Examples

Usage Examples
### Annotate Media
1. **Open a website with media.**
2. **Right-click** on any media item and select "Annotate Media".
3. Enter your annotation in the popup window and save it.

```js
// Example of adding a new annotation
const annotationOnMedia = async (info) => {
  let msgObj = { action: 'annotateMedia', ...info };
  theRealBrowser.tabs.query({ active: true }, async (tabs) => {
    theRealBrowser.tabs.sendMessage(tabs[0].id, msgObj);
  });
};
```

### Perform a Search
1. **Right-click** on the webpage and select "Search".
2. Enter the search terms in the popup and hit Enter.

```js
// Example search handler
async function keydownHandler(searchIn, e) {
  if (e.code === 'Enter') {
    searchIn.disabled = true;
    // Trigger the search
  }
}
```

##
## Code Summary

Code Summary
- **bg.js:** Handles background tasks including listener registration and message passing.
- **config.js:** Contains configuration settings for various extension functionalities like search and annotate.
- **hlte.js:** Manages annotation functionalities and UI control elements.
- **options.js:** Controls options and status icon settings.
- **popup.js:** Manages the annotation input interface in the popup.
- **search.js:** Handles search functionality including media search results rendering.
- **shared.js:** Shared utilities and configurations across different parts of the extension.

##
## License

License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
```