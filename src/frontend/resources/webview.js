const vscode = acquireVsCodeApi();

const refTags = [];
const lineOptions = { 
  size: 2, 
  path: 'grid', 
  startSocket: 'right', 
  endSocket: 'left', 
  startPlug: 'square', 
  endPlug: 'arrow1' 
};

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

// TODO: onLoad Case needs to be covered and implement message from extension to js script above and in visualization_panel.ts
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
  const tags = getChangedTags(traceElem);
  if (tags) {
    tags.forEach((tag) => {
      // Delete Line
      tag.line.remove();
      // Create new Line
      const line = new LeaderLine(
        tag.elem1, tag.elem2, lineOptions
      );
      line.show();
    });
  }
}

function getChangedTags(traceElem) {
  const newTags = getCurrentTags(traceElem);
  if (refTags.length > 0) {
    // Check what changed
    return newTags.filter(nt => {
      let same = false;
      for (var i = 0; i < refTags.length; i++) {
        if(compareElements(nt, rt)) {
          same = true;
          nt.line = rt.line;
          break;
        }
      }
      return !same;
    });
  } else {
    return newTags;
  }
}

function getCurrentTags(traceElem) {
  const tags = traceElem[2].match(/(?<=heapEndPointer).[0-9]+/g);
  return tags.map(t => {
    return {
      elem1: document.getElementById('heapStartPointer' + t),
      elem2: document.getElementById('heapEndPointer' + t),
      line: undefined
    };
  });
}

function getElements(tag) {
  return [
    document.getElementById('heapStartPointer' + tag),
    document.getElementById('heapEndPointer' + tag)
  ];
}

function compareElements(elem1, elem2) {
  return elem1.style.height === elem2.style.height 
  && elem1.style.width === elem2.style.width 
  && elem1.style.x === elem2.style.x 
  && elem1.style.y === elem2.style.y;
}

function onLoad() {
  document.querySelector('#nextButton').disabled = false;
  document.querySelector('#prevButton').disabled = true;
}

async function onClick(type) {
  await vscode.postMessage({ command: 'onClick', type: type });
}