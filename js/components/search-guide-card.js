import store from "../store.js";
import myCustomElements from "./custom-elements.js";
import myProgramElement from "./program-card.js";
import myUtils from "../utils.js";

export default()=>({
    searchGuideElement
})

const { defineComponent } = Vue;

const utils = myUtils()
const state = store().state;
const customElements = myCustomElements()
const programElement = myProgramElement().programElement

  const searchGuideElement = defineComponent({
    setup() {
        return {
            'state': state
        }
    },
    data() {
      return {
        searchQuery: null,
        foundPrograms: [],
        searching: false
      }
    },
    components: {
        'svg-icon': customElements.SVGElement,
        'program-item': programElement
    },
    methods: {
        findPrograms() {
            this.searching = true;
            utils.request('find_program', {'name': this.searchQuery}).then(response => {
                return response.json();
            })
            .then(response => {
                this.foundPrograms = Array.isArray(response) ? response : [];
                this.searching = false;
            })
        },
        searchOnEnter(event) {
            if (event.charCode === 13) {
              this.findPrograms();
            }
        }
    },
    computed: {
    },
    template: `
        <br>
        <p>
      <div class="input-group flex-nowrap">
        <button @click="findPrograms()" type="button" class="input-group-text btn btn-outline-secondary" id="addon-wrapping">Search</button>
        <input v-model="searchQuery" @keypress="searchOnEnter" type="text" class="form-control" id="searchPrograms" placeholder="Program name" aria-label="Username" aria-describedby="addon-wrapping">
      </div>
        <p/>

        <button v-if="this.searching" class="btn btn-primary" type="button" disabled>
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Searching...
        </button>

        <h5 v-if="this.foundPrograms.length > 0">
          <span class="badge bg-secondary">
            Programs <span class="badge bg-dark">{{ foundPrograms.length }}</span>
          </span>
        </h5>
        <div class="list-group">
            <program-item v-for="result in foundPrograms" :match="result"/>
        </div>

        <h6 v-if="!this.searching && this.foundPrograms.length == 0" class="card-subtitle mb-2 text-muted">
        None
        </h6>

    `
  })