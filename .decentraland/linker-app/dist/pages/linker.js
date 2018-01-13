'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _decentralandCommons = require('decentraland-commons');

var _LANDRegistry = require('../contracts/LANDRegistry');

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