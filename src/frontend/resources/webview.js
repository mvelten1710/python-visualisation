const vscode = acquireVsCodeApi();

let refTags = [];

/**
 * Event Listener that listens to all incoming messages from the extension.
 * Needs to be done so that Webview and js Script can communication with one another.
 */
window.addEventListener("message", (event) => {
  // Data send from extension
  const message = event.data;

  switch (message.command) {
    case "updateButtons":
      document.querySelector("#nextButton").disabled = !message.next;
      document.querySelector("#prevButton").disabled = !message.prev;
      document.querySelector("#firstButton").disabled = !message.first;
      document.querySelector("#lastButton").disabled = !message.last;
      break;
    case "updateContent":
      document.querySelector("#traceSlider").value = message.traceIndex;
      document.querySelector("#indexCounter").innerHTML = message.traceIndex;
      updateVisualization(message.traceElem);
      updateIntend(message.traceElem);
      updateRefArrows(message.traceElem);
      break;
  }
});

/**
 * Updates the Visualization in the Webview, with the given BackendTraceElem.
 *
 * @param traceElem A BackendTraceElem with 3 fields (line, stack, heap)
 */
function updateVisualization(traceElem) {
  const data = `
    <div class="row">
      <div class="column floating-left">
        <div class="row title">
          Frames
        </div>
        <div class="divider"></div>
      </div>
      <div class="column floating-right">
        <div class="row title">
          Objects
        </div>
        <div class="divider"></div>
      </div>
    </div>
    <div class="row">
      <div class="column floating-left floating-left-content" id="frames">
      ${traceElem[1]}
      </div>
      <div class="column floating-right floating-right-content" id="objects">
      ${traceElem[2]}
      </div>
    </div>
  `;
  document.getElementById("viz").innerHTML = data;
  document.getElementById("viz").addEventListener("scroll", () => {
    updateRefArrows(traceElem);
  });
}

/**
 * Updates the indendation for heap elements, if a other heap element references it.
 *
 * @param traceElem A BackendTraceElem with 3 fields (line, stack, heap)
 */
function updateIntend(traceElem) {
  const heapTags = traceElem[2].match(/(?<=startPointer)[0-9]+/g);
  if (heapTags) {
    heapTags.forEach((tag) => {
      const element = document.getElementById("objectItem" + tag);
      if (element) { element.classList.add("object-intendation"); }
    });
  }
}

/**
 * Updates the Reference Arrows from frame items to heap & heap items to heap items.
 *
 * @param traceElem A BackendTraceElem with 3 fields (line, stack, heap)
 */
function updateRefArrows(traceElem) {
  const tags = getCurrentTags(traceElem);
  refTags.forEach((tag) => tag.remove());
  refTags = [];

  if (!tags) {
    return;
  }

  refTags = tags
    .filter((tag) => tag.elem1 && tag.elem2)
    .map((tag) => {
      return new LeaderLine(tag.elem1, tag.elem2, {
        size: 2,
        path: "magnet",
        startSocket: "right",
        endSocket: "left",
        startPlug: "square",
        startSocketGravity: [50, -10],
        endSocketGravity: [-5, -5],
        endPlug: "arrow1",
        color: getColor(tag),
      });
    });
}

/**
 * Retrieves all id's on the frame side and heap side, that have a potential start or end pointer in there id.
 * Is later used to create Reference Arrows.
 *
 * @param traceElem A BackendTraceElem with 3 fields (line, stack, heap)
 * @returns A list with all ids that have either a start or end pointer id in the html
 */
function getCurrentTags(traceElem) {
  const stackTags = traceElem[1].match(/(?<=id=")(.+)Pointer[0-9]+/g);
  const heapTags = traceElem[2].match(/(?<=startPointer)[0-9]+/g);
  const uniqueId = traceElem[2].match(/(?<=)\d+(?=startPointer)/g);

  if (!stackTags) {
    return;
  }

  const stackRefs = stackTags.map((tag) => {
    const id = tag.match(/(?<=.*Pointer)[\d]+/g);
    return {
      tag: id,
      elem1: document.getElementById(tag),
      elem2: document.getElementById("heapEndPointer" + id),
    };
  });

  let heapRefs = [];
  if (heapTags) {
    heapRefs = heapTags.map((reference, index) => {
      return {
        tag: reference,
        elem1: document.getElementById(
          uniqueId[index] + "startPointer" + reference
        ),
        elem2: document.getElementById("heapEndPointer" + reference),
      };
    });
  }

  return [...heapRefs, ...stackRefs];
}

/**
 * Creates a color based on the tag number (variable reference).
 *
 * @param tag The tag number (variable reference) is used to create a color.
 * @returns
 */
function getColor(tag) {
  const hue = ((0.618033988749895 + tag.tag / 10) % 1) * 100;
  return `hsl(${hue}, 60%, 45%)`;
}

function onLoad() {
  document.querySelector("#nextButton").disabled = false;
  document.querySelector("#lastButton").disabled = false;
  document.querySelector("#prevButton").disabled = true;
  document.querySelector("#firstButton").disabled = true;
}

async function onClick(type) {
  await vscode.postMessage({ command: "onClick", type: type });
}

async function onSlide(sliderValue) {
  await vscode.postMessage({ command: "onSlide", sliderValue: sliderValue });
}
