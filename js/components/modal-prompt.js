import store from "../store.js";

const { defineComponent } = Vue;

let state = store().state;

export default()=>({
    showModalOk,
    showModalYesNo,
    helpItems,
    promptElement
})

function showModalOk(title, text) {
    showModal(title, text, [{'label': 'Ok', 'primary': false}])
}

function showModalYesNo(title, text, yesAction) {
    showModal(title, text, [
        {'label': 'Yes', 'primary': true},
        {'label': 'No', 'primary': false}
        ],
        function(btn){
        if (btn === 'Yes' && yesAction) {
           return yesAction();
        }
    })
}

function showModal(title, text, buttons, action) {
  state.prompt.title = title;
  state.prompt.text = text;
  state.prompt.buttons = buttons;
  state.prompt.action = action;
  $("#promptModal").modal("show");
}

const helpItems = {
    'watch': `
    Steps to watch:
    <ol>
      <li>Install VLC</li>
      <li>Install the "Open in VLC" browser addon</li>
      </li>Right-click
        <svg class="bi" width="22" height="22" fill="currentColor">
            <use xlink:href="./img/bootstrap-icons-1.8.3/bootstrap-icons.svg#tv"/>
            <title></title>
        </svg>
        and select "Open in VLC" to watch</li>
    </ol>
    `,
    'watch-live': `
    Click on record, then watch the recording :).
    `
}

const promptElement = defineComponent({
    setup() {
        return {'state': state}
    },
    data() {
        return {
        }
    },
    methods: {
    },
    template: `
    <div style="z-index: 1070 !important;" class="modal fade" id="promptModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="exampleModalLabel">{{ state.prompt.title }}</h5>
          </div>
          <div class="modal-body" v-html="state.prompt.text">
          </div>
          <div class="modal-footer">
            <template v-for="btn in state.prompt.buttons">
                <button @click="state.prompt.action(btn.label)" type="button" :class="['btn', (btn.primary) ? 'btn-primary' : 'btn-secondary']" data-bs-dismiss="modal">{{ btn.label }}</button>
            </template>
          </div>
        </div>
      </div>
    </div>
    `
});
