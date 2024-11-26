# metromap

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [License](#license)
- [Contact](#contact)

## Project Overview

**MetroMap** is an interactive graph visualization tool that allows users to create, modify, and interact with hierarchical or networked graphs of nodes. Leveraging powerful libraries like D3.js and integrating seamlessly with Google Drive, MetroMap ensures that your data is always up-to-date and securely stored.

## Features

### GraphComponent
- **Dynamic Rendering:** Utilizes D3.js to render interactive graphs with force-directed layouts.
- **User Interaction:** Supports dragging nodes, clicking nodes to open an editor, and modifying connections.
- **Visual Customization:** Nodes and links feature customizable colors, titles, and line numbers.

### EditorComponent
- **In-Place Editing:** Opens a text editor when a node is clicked, allowing users to update the node's title or notes.
- **Node Management:** Includes functionality to detach nodes, making them top-level entities.
- **Automatic Saving:** Changes are automatically saved to Google Drive, ensuring data persistence.

### Menu/Search Features
- **Search Functionality:** Quickly locate specific nodes within the graph.
- **Graph Controls:** Access controls for adding nodes, undoing actions, and other graph interactions.

### Undo Stack
- **Change Tracking:** Maintains a history of changes (e.g., adding/removing nodes, editing properties) to support undo functionality.
- **Limited History:** Stores the last 10 actions to manage memory efficiently.

### Google Drive Integration
- **Data Persistence:** Loads and saves the graph as JSON data to Google Drive using the Drive API.
- **Real-Time Updates:** Automatically fetches and persists changes, ensuring your data remains current.


## License
This project is licensed under the MIT License.

## Contact
For any questions or feedback, please contact:
Email: lukaspansardi@gmail.com
