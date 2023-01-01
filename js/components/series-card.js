import myUtils from "../utils.js";
import myStore from "../store.js";
import myCustomElements from "./custom-elements.js";
import myModalPrompt from "./modal-prompt.js";

const { defineComponent } = Vue;
const prompt = myModalPrompt();
const utils = myUtils();
const customElements = myCustomElements()
const store = myStore()

export default()=>({
    seriesItemElement
})

const seriesItemElement = defineComponent({
    props: {
        series: Object
    },
    setup() {
        return {
        }
    },
    components: {
        'svg-icon': customElements.SVGElement
    },
    computed: {
        box() {
            return store.getBox(this.series.terminal_id)
        }
    },
    methods: {
        getDateTime: utils.getDateTime,
        cancel_clicked() {
            let mySeries = this.series
            prompt.showModalYesNo('Confirm?', 'Are you sure you want to cancel this series?', function() {
                let params = {
                    "terminal_id": mySeries.terminal_id,
                    "series_link": mySeries.id
                }
                utils.request("cancel_series", params)
                .then(response => {
                    if (!response.ok) {
                        prompt.showModalOk('Error', 'An error occurred cancelling the series. Please try again.');
                    }
                })
            })
        },
        getIcon(channel_id) {
            // Cache icon for subsequent look ups
            if (!(channel_id in store.channelIcons)) {
                let channels = this.box.channels
                let channel = Object.values(channels).filter(function(c) { return c.id === channel_id})
                //TODO: Replace not found with icon
                store.channelIcons[channel_id] = (channel.length > 0) ? channel[0].image_url : 'not_found'
            }
            return store.channelIcons[channel_id]
        },
    },
    template: `
    <a href="#" class="list-group-item list-group-item-action flex-column align-items-start">
        <div class="d-flex w-100 justify-content-between">
          <h5 class="mb-1">
            <button @click="cancel_clicked($event)" type="button" class="btn btn-outline-secondary" :disabled="false">
              <svg-icon name="x-circle" title="cancel"/>
            </button>
            </p>
            <img style="background-color: black; width: 2.5em" :src="this.getIcon(this.series.channel_id)"/>
            {{ this.series.name }}
          </h5>
          Last recorded: S{{this.series.latest_season}}E{{this.series.latest_episode}}
        </div>
    </a>
    `
});
