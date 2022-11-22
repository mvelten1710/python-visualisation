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
      //
      break;
  }
});

function loadVizData() {
  const dataBody = document.getElementById('viz');

  console.log(dataBody);
  
  const data = `
    <table>
      <tbody>
        <tr>
          <td id="stack">
            <div id="frames">
              <div id="framesTitle">Frames</div>
            </div>
          </dt>
          <td id="heap">
            <div id="objects">
              <div id="objectsTitle">Objects</div>
            </div>
          </dt>
        </tr>
      </tbody>
    </table>
  `;

  // TODO: Think about if we insert the whole HTML string or
  // just append and remove elements?

  // Inserting the data just at the beginning of the HTML element
  dataBody.innerHTML = data;
}

function onLoad() {
  document.querySelector('#nextButton').disabled = false;
  document.querySelector('#prevButton').disabled = true;
  loadVizData();
}

async function onClick(type) {
  await vscode.postMessage({ command: 'onClick', type: type });
}