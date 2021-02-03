WebFont.load({
  custom: {
    families: ["Fira Code:n3,n4,n5,n7"]
  },
  active: function() {
    var term = new Terminal({
      cursorStyle: "bar",
      cursorBlink: true,
      tabStopWidth: 4,
      fontFamily: "Fira Code"
    });
    term.open(document.getElementById("terminal"));
    var socket = io();

    function proposeGeometry(term) {
      if (!term.element.parentElement) {
        return null;
      }
      var parentElementStyle = window.getComputedStyle(
        term.element.parentElement
      );
      var parentElementHeight = parseInt(
        parentElementStyle.getPropertyValue("height")
      );
      var parentElementWidth = Math.max(
        0,
        parseInt(parentElementStyle.getPropertyValue("width"))
      );
      var elementStyle = window.getComputedStyle(term.element);
      var elementPadding = {
        top: parseInt(elementStyle.getPropertyValue("padding-top")),
        bottom: parseInt(elementStyle.getPropertyValue("padding-bottom")),
        right: parseInt(elementStyle.getPropertyValue("padding-right")),
        left: parseInt(elementStyle.getPropertyValue("padding-left"))
      };
      var elementPaddingVer = elementPadding.top + elementPadding.bottom;
      var elementPaddingHor = elementPadding.right + elementPadding.left;
      var availableHeight = parentElementHeight - elementPaddingVer;

      var availableWidth =
        parentElementWidth -
        elementPaddingHor -
        term._core.viewport.scrollBarWidth;
      var geometry = {
        cols: Math.floor(
          availableWidth /
            term._core._renderService.dimensions.actualCellWidth
        ),
        rows: Math.floor(
          availableHeight /
            term._core._renderService.dimensions.actualCellHeight
        )
      };
      return geometry;
    }

    function fit(term) {
      var geometry = proposeGeometry(term);
      if (geometry) {
        if (term.rows !== geometry.rows || term.cols !== geometry.cols) {
          term._core._renderService.clear();
          socket.emit("resize", geometry.cols, geometry.rows);
          term.resize(geometry.cols, geometry.rows);
        }
      }
    }

    fit(term);

    window.onresize = function() {
      fit(term);
    };

    socket.on("data", function(data) {
      term.write(data.toString());
    });

    socket.on("login", function() {
      socket.emit("resize", term.cols, term.rows); // force a terminal resize when terminal is created
    });

    term.onData(function(data) {
      socket.emit("data", data);
    });

    socket.on("disconnect", function(reason) {
      term.write("The server closed the connection.");
    });
  }
});
