export default ()=>({
    SVGElement,
    ListElement
})

const { defineComponent } = Vue;

const SVGElement = defineComponent({
    props: {
        name: String,
        title: String
    },
    setup() {
        return {}
    },
    template: `
      <svg class="bi" width="22" height="22" fill="currentColor">
        <use :xlink:href="'./img/bootstrap-icons-1.8.3/bootstrap-icons.svg#'+this.name"/>
        <title>{{(this.title) ? this.title : this.name}}</title>
      </svg>
    `
});

const ListElement = defineComponent({
    props: {
        list: Array,
        ordered: Boolean
    },
    template: `
      <ol v-if="this.ordered">
      <ul v-if="!this.ordered">
          <li v-if="list" v-for="item in list">{{item}}</li>
      </ol v-if="this.ordered">
      </ul v-if="!this.ordered">
    `
});
