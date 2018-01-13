webpackHotUpdate(5,{

/***/ 1749:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


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

var _ethereum = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"decentraland-commons/ethereum\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));

var _LANDRegistry = __webpack_require__(1748);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var instance = null;

var LANDRegistry = function (_ethereum$Contract) {
  (0, _inherits3.default)(LANDRegistry, _ethereum$Contract);

  function LANDRegistry() {
    (0, _classCallCheck3.default)(this, LANDRegistry);

    return (0, _possibleConstructorReturn3.default)(this, (LANDRegistry.__proto__ || (0, _getPrototypeOf2.default)(LANDRegistry)).apply(this, arguments));
  }

  (0, _createClass3.default)(LANDRegistry, [{
    key: 'test',
    value: function test() {
      console.log("test");
    }
  }], [{
    key: 'getInstance',
    value: function getInstance() {
      if (!instance) {
        console.log("ideme", instance);
        instance = new LANDRegistry('LANDRegistry', '0xc371c916fdf2848e3d2c70ac1b9a17168e86d5ef', _LANDRegistry.abi);
      }
      return instance;
    }
  }]);

  return LANDRegistry;
}(ethereum.Contract);

exports.default = LANDRegistry;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRyYWN0cy9MQU5EUmVnaXN0cnkuanMiXSwibmFtZXMiOlsiQ29udHJhY3QiLCJhYmkiLCJpbnN0YW5jZSIsIkxBTkRSZWdpc3RyeSIsImNvbnNvbGUiLCJsb2ciLCJldGhlcmV1bSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxBQUFTLEFBQVQ7O0FBQ0EsQUFBUyxBQUFULEFBQW9CLEFBQXBCOzs7O0FBRUEsSUFBSSxXQUFXLEFBQWY7O0lBRXFCLEE7Ozs7Ozs7Ozs7OzJCQVNWLEFBQ0w7Y0FBUSxBQUFSLElBQVksQUFBWixBQUNEOzs7O2tDQVZvQixBQUNuQjtVQUFJLENBQUUsQUFBTixVQUFnQixBQUNkO2dCQUFRLEFBQVIsSUFBWSxBQUFaLFNBQXFCLEFBQXJCLEFBQ0E7bUJBQVcsSUFBSSxBQUFKLGFBQWlCLEFBQWpCLGdCQUFpQyxBQUFqQyxBQUErRSxBQUEvRSxBQUFYLEFBQ0Q7QUFDRDthQUFPLEFBQVAsQUFDRDs7Ozs7RUFQcUMsU0FBUyxBOztrQkFBOUIsQSIsImZpbGUiOiJMQU5EUmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiL1VzZXJzL21pY2hhbHRha2FjL1Byb2plY3RzL2RlY2VudHJhbGFuZC9jbGkifQ==

 ;(function register() { /* react-hot-loader/webpack */ if (true) { if (typeof __REACT_HOT_LOADER__ === 'undefined') { return; } /* eslint-disable camelcase, no-undef */ var webpackExports = typeof __webpack_exports__ !== 'undefined' ? __webpack_exports__ : module.exports; /* eslint-enable camelcase, no-undef */ if (typeof webpackExports === 'function') { __REACT_HOT_LOADER__.register(webpackExports, 'module.exports', "/Users/michaltakac/Projects/decentraland/cli/contracts/LANDRegistry.js"); return; } /* eslint-disable no-restricted-syntax */ for (var key in webpackExports) { /* eslint-enable no-restricted-syntax */ if (!Object.prototype.hasOwnProperty.call(webpackExports, key)) { continue; } var namedExport = void 0; try { namedExport = webpackExports[key]; } catch (err) { continue; } __REACT_HOT_LOADER__.register(namedExport, key, "/Users/michaltakac/Projects/decentraland/cli/contracts/LANDRegistry.js"); } } })();

/***/ })

})
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiNS5iMzYxZWNlYWM2NzgxZjk0Yzg2ZS5ob3QtdXBkYXRlLmpzIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vLy4vY29udHJhY3RzL0xBTkRSZWdpc3RyeS5qcz9lYzNkNDhhIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnRyYWN0IH0gZnJvbSAnZGVjZW50cmFsYW5kLWNvbW1vbnMvZXRoZXJldW0nO1xuaW1wb3J0IHsgYWJpIH0gZnJvbSAnLi4vY29udHJhY3RzL0xBTkRSZWdpc3RyeS5qc29uJztcblxubGV0IGluc3RhbmNlID0gbnVsbFxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBMQU5EUmVnaXN0cnkgZXh0ZW5kcyBldGhlcmV1bS5Db250cmFjdCB7XG4gICAgc3RhdGljIGdldEluc3RhbmNlKCkge1xuICAgICAgaWYgKCEgaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJpZGVtZVwiLCBpbnN0YW5jZSlcbiAgICAgICAgaW5zdGFuY2UgPSBuZXcgTEFORFJlZ2lzdHJ5KCdMQU5EUmVnaXN0cnknLCAnMHhjMzcxYzkxNmZkZjI4NDhlM2QyYzcwYWMxYjlhMTcxNjhlODZkNWVmJywgYWJpKVxuICAgICAgfVxuICAgICAgcmV0dXJuIGluc3RhbmNlXG4gICAgfVxuXG4gICAgdGVzdCgpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwidGVzdFwiKVxuICAgIH1cbn1cblxuXG5cbi8vIFdFQlBBQ0sgRk9PVEVSIC8vXG4vLyAuL2NvbnRyYWN0cy9MQU5EUmVnaXN0cnkuanMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUFBO0FBQ0E7OztBQUNBO0FBQ0E7Ozs7Ozs7Ozs7OztBQVdBO0FBQUE7Ozs7QUFSQTtBQUFBO0FBQ0E7QUFDQTtBQUVBO0FBQ0E7Ozs7O0FBUEE7QUFDQTs7Ozs7Ozs7QSIsInNvdXJjZVJvb3QiOiIifQ==