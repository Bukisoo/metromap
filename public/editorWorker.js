// editorWorker.js
importScripts('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/highlight.min.js');

self.onmessage = function(e) {
  if (e.data.type === 'format') {
    const content = e.data.content;
    const formattedContent = formatContent(content);
    self.postMessage({ type: 'formattedContent', content: formattedContent });
  }
};

function formatContent(content) {
  // Implement your formatting logic here
  // This is a placeholder implementation
  content.ops.forEach(op => {
    if (op.attributes && op.attributes['code-block']) {
      op.insert = self.hljs.highlightAuto(op.insert).value;
    }
  });
  return content;
}