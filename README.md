# metromap

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [How the Graph Works](#how-the-graph-works)
- [Editor Functionality](#editor-functionality)
- [Other Features](#other-features)
- [Installation](#installation)
- [Usage](#usage)
- [Privacy Policy](#privacy-policy)
- [Contributing](#contributing)
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

## How the Graph Works

### Node and Link Creation
- **Hierarchical Structure:** Nodes are categorized as top-level, branch, or leaf nodes based on their position in the hierarchy.
- **Visual Distinctions:** Nodes feature unique sizes and colors, each containing titles, notes, and unique IDs.

### Dynamic Layout
- **Force Simulations:** Employs D3 force simulations to dynamically position nodes and links.
- **Collision Handling:** Implements repulsion, attraction, and collision forces to prevent node overlap and ensure readability.

### Node Features
- **Angled Titles:** Titles are displayed at a 45° angle above nodes for clarity.
- **Line Numbers:** Leaf nodes showcase line numbers within colored rectangles.
- **Interactive Editing:** Clicking nodes opens the EditorComponent for seamless editing.

### Interactions
- **Drag-and-Drop:** Manually reposition nodes through intuitive dragging.
- **Connection Management:** Connect, detach, or reassign nodes within the graph hierarchy.

## Editor Functionality

The **EditorComponent** provides a robust interface for managing node details:
- **Modify Node Details:** Change the name or notes associated with a node.
- **Detach Nodes:** Remove a node from its parent, elevating it to a top-level node.
- **Automatic Saving:** All edits are saved in real-time to Google Drive, ensuring data integrity.

## Other Features

### Grid Background
- **Visual Organization:** Renders the graph on a grid-like background to enhance visual structure and navigation.

### Simulation Freezing
- **Smooth Interactions:** Temporarily freezes simulations during actions like toggling the editor to prevent jarring movements.

### Graph Persistence
- **Consistent State:** Persists node positions and states, maintaining consistency across interactions and page reloads.
- **Recursive Management:** Utilizes a flattening function to manage hierarchical relationships efficiently.

### Styling
- **Custom Aesthetics:** Employs custom colors and fonts (e.g., EB Garamond) to maintain a cohesive and visually appealing design.
- **Collision Handling:** Ensures nodes and titles do not overlap, enhancing readability.

### Customization
- **Dynamic Node Addition:** Users can add new nodes with predefined or dynamically generated names, such as station names or random selections.

## Installation

Follow these steps to set up the project locally:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Bukisoo/d3-force-tree-app.git
