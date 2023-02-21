(function() {
  function main() {
    prepare_document_theme();
    
    document.querySelectorAll('.upc-section').forEach((upc_section_node) => {
      upc_section_node.addEventListener("click", select_text)
    });
  }

  function select_text(event) {
    const range = document.createRange();
    
    let upc_number_node = event.target;
    if (upc_number_node.classList.contains("upc-section")) {
      upc_number_node = upc_number_node.parentElement;
    }

    range.selectNodeContents(upc_number_node);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }

  function prepare_document_theme() {
    document.documentElement.removeAttribute("data-bs-theme");
    document.querySelector("header").setAttribute("data-bs-theme", "dark");
    document.querySelector("main").classList.remove("mx-auto");
    document.querySelector("main").classList.add("mx-2");
  }
  
  main();
})();
