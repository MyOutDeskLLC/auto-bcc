
// import crel from "crel";
// import crelns from "crelns";
import {createApp} from "vue";
import App from "./App2.vue";

function mountVue() {
    const div = document.createElement("div");
    div.id = "app";
    document.body.insertBefore(div, document.body.firstChild);
    let app = createApp(App);
    app.mount("#app");
}

mountVue();


//
// function createModal() {
//
//
//     // let closeButton = crel("button", {
//     //         class: "rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
//     //         type: "button",
//     //         on: {
//     //             click: () => {
//     //                 console.log("Clicked");
//     //             },
//     //         },
//     //     },
//     //     crel("span", {class: "sr-only"}),
//     //     crelns("http://www.w3.org/2000/svg", "svg", {fill: "none", viewBox: "0 0 24 24", "stroke-width": "1.5", stroke: "currentColor", class: "w-6 h-6"},
//     //         crelns("http://www.w3.org/2000/svg", "path", {"stoke-linecap": "round", "stroke-linejoin": "round", d: "M6 18L18 6M6 6l12 12"}),
//     //     ),
//     // );
//     //
//     // let modal = crel("div", {class: "relative z-10", id: "modal", "aria-labelledby": "modal-title", role: "dialog", "aria-modal": "true"},
//     //     //Backdrop
//     //     crel("div", {class: "fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"}),
//     //     crel("div", {class: "fixed inset-0 z-10 overflow-y-auto"},
//     //         //Modal Card
//     //         crel("div", {class: "flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"},
//     //             //Modal Body
//     //             crel("div", {class: "relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"},
//     //                 //Close div
//     //                 crel("div", {class: "absolute top-0 right-0 hidden pt-4 pr-4 sm:block"},
//     //                     closeButton,
//     //                 ),
//     //                 //below the close
//     //                 crel("div", {class: "sm:flex sm:items-start"},
//     //                     crel("div", {class: "mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"}, "title"),
//     //                 ),
//     //             ),
//     //         ),
//     //     ),
//     // );
//     // document.body.append(modal);
//
// }
//
//
// function createElement(type, classes, id = null) {
//     let element = document.createElement(type);
//     element.classList.add(...classes);
//     if (id) {
//         element.id = id;
//     }
//     return element;
// }


// gmail.observe.before("send_message", (url, body, data, xhr) => {
//     alert("url:", url, "body", body, "email_data", data, "xhr", xhr);
// });



