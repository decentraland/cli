webpackHotUpdate(5,{

/***/ 764:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(__resourceQuery) {

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf = __webpack_require__(44);

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = __webpack_require__(15);

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = __webpack_require__(16);

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = __webpack_require__(45);

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = __webpack_require__(49);

var _inherits3 = _interopRequireDefault(_inherits2);

var _regenerator = __webpack_require__(87);

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = __webpack_require__(88);

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _react = __webpack_require__(17);

var _react2 = _interopRequireDefault(_react);

var _decentralandCommons = __webpack_require__(1106);

var _LANDRegistry = __webpack_require__(1749);

var _LANDRegistry2 = _interopRequireDefault(_LANDRegistry);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _jsxFileName = '/Users/michaltakac/Projects/decentraland/cli/pages/linker.js?entry';

var ethereum = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
    var ethInstance, landRegistry, gasParams;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _decentralandCommons.eth.connect(null, [_LANDRegistry2.default]);

          case 2:
            ethInstance = _context.sent;

            console.log(_decentralandCommons.eth);
            _context.next = 6;
            return _decentralandCommons.eth.getContract('LANDRegistry');

          case 6:
            landRegistry = _context.sent;

            console.log(landRegistry);
            gasParams = { gas: 1e6, gasPrice: 21e9 };
            _context.next = 11;
            return landRegistry.assignMultipleParcels([40, 40, 41, 41], [10, 11, 10, 11], _decentralandCommons.eth.getAddress());

          case 11:
            _context.t0 = _decentralandCommons.eth.getAddress();
            _context.next = 14;
            return _decentralandCommons.eth.getContract('LANDRegistry');

          case 14:
            _context.t1 = _context.sent;
            return _context.abrupt('return', {
              address: _context.t0,
              landRegistry: _context.t1
            });

          case 16:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function ethereum() {
    return _ref.apply(this, arguments);
  };
}();

//import 'babel-polyfill';


var _class = function (_React$Component) {
  (0, _inherits3.default)(_class, _React$Component);

  function _class() {
    var _ref2,
        _this2 = this;

    (0, _classCallCheck3.default)(this, _class);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var _this = (0, _possibleConstructorReturn3.default)(this, (_ref2 = _class.__proto__ || (0, _getPrototypeOf2.default)(_class)).call.apply(_ref2, [this].concat(args)));

    _this.updateLandData = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return landRegistry.getOwner(0, 0);

            case 2:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, _this2);
    }));

    _this.renderUI = function () {};

    _this.state = {
      loading: true,
      error: false,
      address: null
    };
    return _this;
  }

  (0, _createClass3.default)(_class, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this3 = this;

      ethereum().then(function (res) {
        _this3.setState({
          loading: false,
          address: res.address,
          landRegistry: res.landRegistry
        });
      }).catch(function (err) {
        _this3.setState({ error: err.message });
      });
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement('div', {
        __source: {
          fileName: _jsxFileName,
          lineNumber: 60
        }
      }, 'MetaMask address: ', this.state.name, this.state.error);
    }
  }]);

  return _class;
}(_react2.default.Component);

exports.default = _class;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInBhZ2VzL2xpbmtlci5qcyJdLCJuYW1lcyI6WyJldGgiLCJjb25uZWN0IiwiTEFORFJlZ2lzdHJ5IiwiZXRoSW5zdGFuY2UiLCJjb25zb2xlIiwibG9nIiwiZ2V0Q29udHJhY3QiLCJsYW5kUmVnaXN0cnkiLCJnYXNQYXJhbXMiLCJnYXMiLCJnYXNQcmljZSIsImFzc2lnbk11bHRpcGxlUGFyY2VscyIsImdldEFkZHJlc3MiLCJhZGRyZXNzIiwiZXRoZXJldW0iLCJSZWFjdCIsImFyZ3MiLCJ1cGRhdGVMYW5kRGF0YSIsImdldE93bmVyIiwicmVuZGVyVUkiLCJzdGF0ZSIsImxvYWRpbmciLCJlcnJvciIsInRoZW4iLCJzZXRTdGF0ZSIsInJlcyIsImNhdGNoIiwiZXJyIiwibWVzc2FnZSIsIm5hbWUiLCJDb21wb25lbnQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxBQUFPOzs7O0FBQ1AsQUFBUzs7QUFDVCxBQUFPLEFBQWtCOzs7Ozs7Ozs7c0ZBR3pCLG1CQUFBO21DQUFBO2tFQUFBO2dCQUFBO3lDQUFBO2VBQUE7NEJBQUE7bUJBQzRCLHlCQUFBLEFBQUksUUFBSixBQUFZLE1BRHhDLEFBQzRCLEFBQWtCLEFBQUM7O2VBQXZDO0FBRFIsbUNBRUU7O29CQUZGLEFBRUUsQUFBUSxBQUFJOzRCQUZkO21CQUc2Qix5QkFBQSxBQUFJLFlBSGpDLEFBRzZCLEFBQWdCOztlQUFyQztBQUhSLG9DQUlFOztvQkFBQSxBQUFRLElBQVIsQUFBWSxBQUNOO0FBTFIsd0JBS29CLEVBQUUsS0FBRixBQUFPLEtBQUssVUFMaEMsQUFLb0IsQUFBc0I7NEJBTDFDO21CQU1RLGFBQUEsQUFBYSxzQkFBc0IsQ0FBQSxBQUFDLElBQUQsQUFBSyxJQUFMLEFBQVMsSUFBNUMsQUFBbUMsQUFBYSxLQUFLLENBQUEsQUFBQyxJQUFELEFBQUssSUFBTCxBQUFTLElBQTlELEFBQXFELEFBQWEsS0FBSyx5QkFOL0UsQUFNUSxBQUF1RSxBQUFJOztlQU5uRjswQkFhYSx5QkFiYixBQWFhLEFBQUk7NEJBYmpCO21CQWN3Qix5QkFBQSxBQUFJLFlBZDVCLEFBY3dCLEFBQWdCOztlQWR4QzttQ0FBQTs7QUFBQSxnQ0FjSTtBQWRKLHFDQUFBO0FBYUk7O2VBYko7ZUFBQTs0QkFBQTs7QUFBQTtnQkFBQTtBOztrQixBQUFlOzs7OztBQU5mOzs7O2tDQXlCRTs7b0JBQXFCO1FBQUE7aUJBQUE7O3dDQUFBOztzQ0FBTixBQUFNLG1EQUFOO0FBQU0sNkJBQUE7QUFBQTs7bUtBQUEsQUFDVjs7VUFEVSxBQXdCckIsMEZBQWlCLG9CQUFBO3NFQUFBO2tCQUFBOzZDQUFBO2lCQUFBOytCQUFBO3FCQUNULGFBQUEsQUFBYSxTQUFiLEFBQXNCLEdBRGIsQUFDVCxBQUF5Qjs7aUJBRGhCO2lCQUFBOytCQUFBOztBQUFBO21CQUFBO0FBeEJJOztVQUFBLEFBNEJyQixXQUFXLFlBQU0sQUFFaEIsQ0E5Qm9CLEFBR25COztVQUFBLEFBQUs7ZUFBUSxBQUNGLEFBQ1Q7YUFGVyxBQUVKLEFBQ1A7ZUFOaUIsQUFHbkIsQUFBYSxBQUdGO0FBSEUsQUFDWDtXQUlIOzs7Ozt3Q0FFbUI7bUJBQ2xCOztpQkFBQSxBQUNHLEtBQUssZUFBTyxBQUNYO2VBQUEsQUFBSzttQkFBUyxBQUNILEFBQ1Q7bUJBQVMsSUFGRyxBQUVDLEFBQ2I7d0JBQWMsSUFIaEIsQUFBYyxBQUdNLEFBRXJCO0FBTGUsQUFDWjtBQUhOLFNBQUEsQUFRRyxNQUFNLGVBQU8sQUFDWjtlQUFBLEFBQUssU0FBUyxFQUFDLE9BQU8sSUFBdEIsQUFBYyxBQUFZLEFBQzNCO0FBVkgsQUFXRDs7Ozs2QkFVUSxBQUNQOzZCQUNFLGNBQUE7O29CQUFBO3NCQUFBO0FBQUE7QUFBQSxPQUFBLEVBQ3FCLDJCQUFBLEFBQUssTUFEMUIsQUFDZ0MsQUFFN0IsV0FBQSxBQUFLLE1BSlYsQUFDRSxBQUdjLEFBR2pCOzs7OztFQXpDMEIsZ0JBQU0sQSIsImZpbGUiOiJsaW5rZXIuanM/ZW50cnkiLCJzb3VyY2VSb290IjoiL1VzZXJzL21pY2hhbHRha2FjL1Byb2plY3RzL2RlY2VudHJhbGFuZC9jbGkifQ==

 ;(function register() { /* react-hot-loader/webpack */ if (true) { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } /* eslint-disable camelcase, no-undef */ var webpackExports = typeof __webpack_exports__ !== 'undefined' ? __webpack_exports__ : module.exports; /* eslint-enable camelcase, no-undef */ if (typeof webpackExports === 'function') { __REACT_HOT_LOADER__.register(webpackExports, 'module.exports', "/Users/michaltakac/Projects/decentraland/cli/pages/linker.js"); return; } /* eslint-disable no-restricted-syntax */ for (var key in webpackExports) { /* eslint-enable no-restricted-syntax */ if (!Object.prototype.hasOwnProperty.call(webpackExports, key)) { continue; } var namedExport = void 0; try { namedExport = webpackExports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "/Users/michaltakac/Projects/decentraland/cli/pages/linker.js"); } } })();
    (function (Component, route) {
      if (false) return
      if (false) return

      var qs = __webpack_require__(84)
      var params = qs.parse(__resourceQuery.slice(1))
      if (params.entry == null) return

      module.hot.accept()
      Component.__route = route

      if (module.hot.status() === 'idle') return

      var components = next.router.components
      for (var r in components) {
        if (!components.hasOwnProperty(r)) continue

        if (components[r].Component.__route === route) {
          next.router.update(r, Component)
        }
      }
    })(typeof __webpack_exports__ !== 'undefined' ? __webpack_exports__.default : (module.exports.default || module.exports), "/linker")
  
/* WEBPACK VAR INJECTION */}.call(exports, "?entry"))

/***/ })

})
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiNS41MTUxZGFjMWI4ZDNkNGY3ZjEzYi5ob3QtdXBkYXRlLmpzIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vLy4vcGFnZXMvbGlua2VyLmpzP2EyNmU4YjQiXSwic291cmNlc0NvbnRlbnQiOlsiLy9pbXBvcnQgJ2JhYmVsLXBvbHlmaWxsJztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBldGggfSBmcm9tICdkZWNlbnRyYWxhbmQtY29tbW9ucyc7XG5pbXBvcnQgTEFORFJlZ2lzdHJ5IGZyb20gJy4uL2NvbnRyYWN0cy9MQU5EUmVnaXN0cnknO1xuXG5cbmFzeW5jIGZ1bmN0aW9uIGV0aGVyZXVtKCkge1xuICBjb25zdCBldGhJbnN0YW5jZSA9IGF3YWl0IGV0aC5jb25uZWN0KG51bGwsIFtMQU5EUmVnaXN0cnldKVxuICBjb25zb2xlLmxvZyhldGgpXG4gIGNvbnN0IGxhbmRSZWdpc3RyeSA9IGF3YWl0IGV0aC5nZXRDb250cmFjdCgnTEFORFJlZ2lzdHJ5JylcbiAgY29uc29sZS5sb2cobGFuZFJlZ2lzdHJ5KVxuICBjb25zdCBnYXNQYXJhbXMgPSB7IGdhczogMWU2LCBnYXNQcmljZTogMjFlOSB9XG4gIGF3YWl0IGxhbmRSZWdpc3RyeS5hc3NpZ25NdWx0aXBsZVBhcmNlbHMoWzQwLCA0MCwgNDEsIDQxXSwgWzEwLCAxMSwgMTAsIDExXSwgZXRoLmdldEFkZHJlc3MoKSlcbiAgLy9hd2FpdCBsYW5kUmVnaXN0cnkudXBkYXRlTWFueUxhbmREYXRhKFsxLCAyXSwgWzAsIDBdLCBcIlFtZW1KZVJEam84SnhtUEVWaHE3WVIzNnVoZTJGekFOQ1JHdE5ocjVBNWg4eDVcIilcbiAgLy8gY29uc29sZS5sb2coYXdhaXQgbGFuZFJlZ2lzdHJ5LmdldE93bmVyKDQxLCAxMCkpXG4gIC8vIGNvbnNvbGUubG9nKGF3YWl0IGxhbmRSZWdpc3RyeS5nZXRPd25lcig0MSwgMTEpKVxuICAvLyBjb25zb2xlLmxvZyhhd2FpdCBsYW5kUmVnaXN0cnkuZ2V0T3duZXIoNDAsIDEwKSlcbiAgLy8gY29uc29sZS5sb2coYXdhaXQgbGFuZFJlZ2lzdHJ5LmdldE93bmVyKDQwLCAxMSkpXG4gIHJldHVybiB7XG4gICAgYWRkcmVzczogZXRoLmdldEFkZHJlc3MoKSxcbiAgICBsYW5kUmVnaXN0cnk6IGF3YWl0IGV0aC5nZXRDb250cmFjdCgnTEFORFJlZ2lzdHJ5JylcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gIGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcbiAgICBzdXBlciguLi5hcmdzKTtcblxuICAgIHRoaXMuc3RhdGUgPSB7XG4gICAgICBsb2FkaW5nOiB0cnVlLFxuICAgICAgZXJyb3I6IGZhbHNlLFxuICAgICAgYWRkcmVzczogbnVsbFxuICAgIH1cbiAgfVxuXG4gIGNvbXBvbmVudERpZE1vdW50KCkge1xuICAgIGV0aGVyZXVtKClcbiAgICAgIC50aGVuKHJlcyA9PiB7XG4gICAgICAgIHRoaXMuc2V0U3RhdGUoe1xuICAgICAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgICAgIGFkZHJlc3M6IHJlcy5hZGRyZXNzLFxuICAgICAgICAgIGxhbmRSZWdpc3RyeTogcmVzLmxhbmRSZWdpc3RyeVxuICAgICAgICB9KVxuICAgICAgfSlcbiAgICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgICB0aGlzLnNldFN0YXRlKHtlcnJvcjogZXJyLm1lc3NhZ2V9KVxuICAgICAgfSk7XG4gIH1cblxuICB1cGRhdGVMYW5kRGF0YSA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBsYW5kUmVnaXN0cnkuZ2V0T3duZXIoMCwgMClcbiAgfVxuXG4gIHJlbmRlclVJID0gKCkgPT4ge1xuXG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXY+XG4gICAgICAgIE1ldGFNYXNrIGFkZHJlc3M6IHt0aGlzLnN0YXRlLm5hbWV9XG5cbiAgICAgICAge3RoaXMuc3RhdGUuZXJyb3J9XG4gICAgICA8L2Rpdj5cbiAgICApXG4gIH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL3BhZ2VzL2xpbmtlci5qcz9lbnRyeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBO0FBQ0E7OztBQUFBO0FBQ0E7QUFBQTtBQUNBOzs7Ozs7OztBQUVBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQ0E7QUFDQTtBQURBO0FBREE7QUFDQTtBQUNBO0FBRkE7QUFHQTtBQUNBO0FBREE7QUFIQTtBQUNBO0FBR0E7QUFKQTtBQUFBO0FBTUE7QUFDQTtBQVBBO0FBYUE7QUFiQTtBQWNBO0FBQ0E7QUFmQTtBQUFBOztBQUFBO0FBQUE7QUFhQTtBQUNBO0FBZEE7QUFBQTtBQUFBOztBQUFBO0FBQUE7Ozs7Ozs7O0FBTkE7QUFDQTtBQUNBOztBQXVCQTtBQUNBO0FBREE7QUFBQTtBQUFBO0FBQ0E7QUFEQTtBQUNBO0FBREE7QUFBQTtBQUFBO0FBQ0E7QUFBQTtBQUNBO0FBc0JBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNBO0FBQ0E7QUFGQTtBQUFBO0FBQUE7O0FBQUE7QUFBQTtBQXhCQTtBQUNBO0FBMkJBO0FBQ0E7QUExQkE7QUFFQTtBQUNBO0FBQUE7QUFGQTtBQUlBOzs7OztBQUVBO0FBQ0E7QUFDQTtBQUFBO0FBQ0E7QUFFQTtBQUFBO0FBQ0E7QUFGQTtBQUhBO0FBU0E7QUFFQTs7OztBQVdBO0FBQ0E7O0FBQUE7QUFBQTtBQUFBO0FBQUE7Ozs7O0FBbkNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0EiLCJzb3VyY2VSb290IjoiIn0=