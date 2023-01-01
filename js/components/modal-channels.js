import myStore from "../store.js";
import myUtils from "../utils.js";

const { defineComponent } = Vue;

export default()=>({
    channelElement
})

const utils = myUtils();
const store = myStore();

const channelElement = defineComponent({
    props: {
        boxId: String
    },
    data() {
        return {
            box: store.getBox(this.boxId),
            myChannels: null
        }
    },
    computed: {
        elementId() {
            return 'channels' + this.box.ip_address.replace(/\./g ,'_')
        },
        filteredChannels() {
            return (this.myChannels) ? this.myChannels : this.box.channels
        }
    },
    methods: {
        filterChannel(filter) {
            let result = this.box.channels
            switch(filter) {
                case 'hd':
                  result = Object.values(result).filter(function (channel) { return channel.high_definition } );
                  break;
                case 'tv':
                  result = Object.values(result).filter(function (channel) { return channel.channel_type === 'Television' } );
                  break
                case 'radio':
                  result = Object.values(result).filter(function (channel) { return channel.channel_type === 'Radio' } );
                  break
            }
            this.myChannels = result
        },
        changeChannel(channel_id) {
            let params = {
                "terminal_id": this.box.terminal_id,
                "channel_id": channel_id
            }
            utils.request('change_channel', params)
            .then(response => {
                if(!response.ok){
                    //TODO handle error
                }
            })
        }
    },
    template: `
    <div class="modal fade" :id="this.elementId" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="exampleModalLabel">Select Channel</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
          <div class="btn-group" role="group" aria-label="Basic radio toggle button group">
              <input @click="filterChannel('all')" type="radio" class="btn-check" name="btnradio" id="btnradio1" autocomplete="off" checked>
              <label class="btn btn-outline-primary" for="btnradio1">All</label>

              <input type="radio" class="btn-check" name="btnradio" id="btnradio2" autocomplete="off">
              <label @click="filterChannel('tv')" class="btn btn-outline-primary" for="btnradio2">TV</label>

              <input type="radio" class="btn-check" name="btnradio" id="btnradio3" autocomplete="off">
              <label @click="filterChannel('hd')" class="btn btn-outline-primary" for="btnradio3">HD</label>

              <input type="radio" class="btn-check" name="btnradio" id="btnradio4" autocomplete="off">
              <label @click="filterChannel('radio')" class="btn btn-outline-primary" for="btnradio4">Radio</label>
            </div>
            <ul class="list-group list-group-flush">
              <a href="#" @click="changeChannel(item.id)" v-if="this.filteredChannels" v-for="item in Object.values(this.filteredChannels).sort(function(a, b) {return a.name.localeCompare(b.name)} )" class="list-group-item list-group-item-action">
              <img style="background-color: black;" :src="item.image_url">
              {{item.description + ' - ' + item.id}}
              </a>
            </ul>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
    `
});
