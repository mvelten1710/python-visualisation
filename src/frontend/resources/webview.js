const vscode = acquireVsCodeApi();

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
      createRefArrows(message.traceElem);
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

// ?: stands for the number of the item
function frameItem(stackElem) {
  const keys = Array.from(Object.keys(stackElem.locals));
  const values = Array.from(Object.values(stackElem.locals));
  return `
    <div class="column" id="frameItem?">
      <div class="row" id="frameItemTitle">${stackElem.frameName === '<module>' ? 'Global' : stackElem.frameName}</div>
      <div class="column" id="frameItemSubItems">
        ${keys.map((name, index) => frameSubItem(name, values[index])).join('')}
      </div>
    </div>
  `;
}

function frameSubItem(name, value) {
  return `
    <div class="line" id="subItem?">
      <div>${value.type}-</div>
      <div>${name}-</div>
      <div>${value.value}</div>
    </div>
  `;
}

function createRefArrows(traceElem) {
  const tags = traceElem[2].match(/(?<=heapEndPointer).[0-9]+/g);
  if (tags) {
    tags.forEach((key) => {
      const line = new LeaderLine(
        document.getElementById('heapStartPointer' + key),
        document.getElementById('heapEndPointer' + key)
      );
      line.show();
    });
  }
}


function objectItem() {

}

function onLoad() {
  document.querySelector('#nextButton').disabled = false;
  document.querySelector('#prevButton').disabled = true;
}

async function onClick(type) {
  await vscode.postMessage({ command: 'onClick', type: type });
}