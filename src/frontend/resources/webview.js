const vscode = acquireVsCodeApi();

let refTags = [];

window.addEventListener('message', event => {
  // Data send from extension
  const message = event.data; 

  switch(message.command) {
    case 'updateButtons':
      document.querySelector('#nextButton').disabled = !message.next;
      document.querySelector('#prevButton').disabled = !message.prev;
      break;
    case 'updateContent':
      updateVisualization(message.traceElem);
      updateRefArrows(message.traceElem);
      break;
  }
});

function updateVisualization(traceElem) {
  const data = `
    <div class="column floating-left" id="frames">
      <div class="row title">Frames</div>
      <div class="divider"></div>
      ${traceElem[1]}
    </div>

    <div class="column floating-right" id="objects">
      <div class="row title">Objects</div>
      <div class="divider"></div>
      ${traceElem[2]}
    </div>
  `;
  document.getElementById('viz').innerHTML = data;
}

function updateRefArrows(traceElem) {
  const tags = getCurrentTags(traceElem);
  refTags.forEach(tag => tag.remove());
  if (tags) {
    refTags = tags.map(tag => {
      return new LeaderLine(tag.elem1, tag.elem2, { 
        size: 2, 
        startSocket: 'right', 
        endSocket: 'left', 
        startPlug: 'square', 
        endPlug: 'arrow1',
        color: getRandomColor()
      });
    });
  }
}

function getCurrentTags(traceElem) {
  const tags = traceElem[2].match(/(?<=heapEndPointer).[0-9]+/g);
  if (tags) {
    return tags.map(t => {
      return {
        elem1: document.getElementById('heapStartPointer' + t),
        elem2: document.getElementById('heapEndPointer' + t),
      };
    });
  } else {
    return [];
  }
}

function getRandomColor() {
  return `rgba(${Math.random()* 255}, ${Math.random()* 255}, ${Math.random()* 255}, 1)`;
}

function onLoad() {
  document.querySelector('#nextButton').disabled = false;
  document.querySelector('#prevButton').disabled = true;
}

async function onClick(type) {
  await vscode.postMessage({ command: 'onClick', type: type });
}