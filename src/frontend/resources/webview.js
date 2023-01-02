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
      updateIntend(message.traceElem);
      updateRefArrows(message.traceElem);
      break;
  }
});

function updateVisualization(traceElem) {
  const data = `
    <div class="row">
      <div class="column">
        <div class="row title">
          Frames
          <div class="divider"></div>
        </div>
      </div>
      <div>
        <div class="row title">
          Objects
          <div class="divider"></div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="column floating-left" id="frames">
      ${traceElem[1]}
      </div>
      <div class="column floating-right" id="objects">
      ${traceElem[2]}
      </div>
    </div>
  `;
  document.getElementById('viz').innerHTML = data;
}

function updateIntend(traceElem) {
  const heapTags = traceElem[2].match(/(?<=startPointer)[0-9]+/g);
  if (heapTags) {
    heapTags.forEach(tag => {
      document.getElementById('objectItem' + tag).classList.add('object-intendation');
    });
  }
}

function updateRefArrows(traceElem) {
  const tags = getCurrentTags(traceElem);
  refTags.forEach(tag => tag.remove());
  if (tags) {
    refTags = tags.map(tag => {
      return new LeaderLine(tag.elem1, tag.elem2, { 
        size: 2,
        path: 'magnet',
        startSocket: 'right', 
        endSocket: 'left', 
        startPlug: 'square',
        startSocketGravity: [50, -10],
        endSocketGravity: [-5, -5],
        endPlug: 'arrow1',
        color: getColor(tag)
      });
    });
  }
}

function getCurrentTags(traceElem) {
  const normalTags = traceElem[1].match(/(?<=heapStartPointer)[0-9]+/g);
  const heapTags = traceElem[2].match(/(?<=startPointer)[0-9]+/g);
  if (normalTags) {
    let s = [];
    const t = normalTags.map(t => {
      return {
        tag: t,
        elem1: document.getElementById('heapStartPointer' + t),
        elem2: document.getElementById('heapEndPointer' + t),
      };
    });
    if (heapTags) {
      s = heapTags.map(t => {
        return {
          tag: t,
          elem1: document.getElementById('startPointer' + t),
          elem2: document.getElementById('heapEndPointer' + t),
        };
      });
    }
    return [...s, ...t];
  } else {
    return [];
  }
}

function getColor(tag) {
  return `rgba(${(tag.tag * 123)%255}, ${(tag.tag * 223)%255}, ${(tag.tag * 323)%255}, 1)`;
}

function onLoad() {
  document.querySelector('#nextButton').disabled = false;
  document.querySelector('#prevButton').disabled = true;
}

async function onClick(type) {
  await vscode.postMessage({ command: 'onClick', type: type });
}