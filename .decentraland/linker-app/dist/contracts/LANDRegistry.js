'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

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

var _decentralandCommons = require('decentraland-commons');

var _decentralandCommons2 = _interopRequireDefault(_decentralandCommons);

var _LANDRegistry = require('../contracts/LANDRegistry.json');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var instance = null;
var DEVELOPMENT_CONTRACT = '0x8cdaf0cd259887258bc13a92c0a6da92698644c0';

var LANDRegistry = function (_ethereum$Contract) {
  (0, _inherits3.default)(LANDRegistry, _ethereum$Contract);

  function LANDRegistry() {
    (0, _classCallCheck3.default)(this, LANDRegistry);

    return (0, _possibleConstructorReturn3.default)(this, (LANDRegistry.__proto__ || (0, _getPrototypeOf2.default)(LANDRegistry)).apply(this, arguments));
  }

  (0, _createClass3.default)(LANDRegistry, [{
    key: 'getOwner',
    value: function getOwner(x, y) {
      return this.call('ownerOfLand', x, y);
    }
  }, {
    key: 'ownerOfLandMany',
    value: function ownerOfLandMany(x, y) {
      return this.call('ownerOfLandMany', x, y);
    }
  }, {
    key: 'landData',
    value: function landData(x, y) {
      return this.call('landData', x, y);
    }
  }, {
    key: 'updateManyLandData',
    value: function updateManyLandData(x, y, data) {
      return this.transaction('updateManyLandData', x, y, data);
    }
  }, {
    key: 'assignMultipleParcels',
    value: function assignMultipleParcels(x, y, address) {
      var opts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

      return this.transaction('assignMultipleParcels', x, y, address, (0, _assign2.default)({}, { gas: 1000000, gasPrice: 28 * 1e9 }, opts));
    }
  }], [{
    key: 'getInstance',
    value: function getInstance() {
      if (!instance) {
        instance = new LANDRegistry('LANDRegistry', "0x9519216b1d15a91e71e8cfa17cc45bcc7707e500", _LANDRegistry.abi);
      }
      return instance;
    }
  }]);

  return LANDRegistry;
}(_decentralandCommons2.default.Contract);

exports.default = LANDRegistry;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRyYWN0cy9MQU5EUmVnaXN0cnkuanMiXSwibmFtZXMiOlsiZXRoZXJldW0iLCJhYmkiLCJpbnN0YW5jZSIsIkRFVkVMT1BNRU5UX0NPTlRSQUNUIiwiTEFORFJlZ2lzdHJ5IiwieCIsInkiLCJjYWxsIiwiZGF0YSIsInRyYW5zYWN0aW9uIiwiYWRkcmVzcyIsIm9wdHMiLCJnYXMiLCJnYXNQcmljZSIsIkNvbnRyYWN0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxBQUFPLEFBQVA7Ozs7QUFDQSxBQUFTLEFBQVQsQUFBb0IsQUFBcEI7Ozs7QUFFQSxJQUFJLFdBQVcsQUFBZjtBQUNBLElBQU0sdUJBQXVCLEFBQTdCOztJQUVxQixBOzs7Ozs7Ozs7Ozs2QkFZUixBLEdBQUcsQSxHQUFHLEFBQ2I7YUFBTyxLQUFLLEFBQUwsS0FBVSxBQUFWLGVBQXlCLEFBQXpCLEdBQTRCLEFBQTVCLEFBQVAsQUFDRDs7OztvQ0FFZSxBLEdBQUcsQSxHQUFHLEFBQ3BCO2FBQU8sS0FBSyxBQUFMLEtBQVUsQUFBVixtQkFBNkIsQUFBN0IsR0FBZ0MsQUFBaEMsQUFBUCxBQUNEOzs7OzZCQUVRLEEsR0FBRyxBLEdBQUcsQUFDYjthQUFPLEtBQUssQUFBTCxLQUFVLEFBQVYsWUFBc0IsQUFBdEIsR0FBeUIsQUFBekIsQUFBUCxBQUNEOzs7O3VDQUVrQixBLEdBQUcsQSxHQUFHLEEsTUFBTSxBQUM3QjthQUFPLEtBQUssQUFBTCxZQUFpQixBQUFqQixzQkFBdUMsQUFBdkMsR0FBMEMsQUFBMUMsR0FBNkMsQUFBN0MsQUFBUCxBQUNEOzs7OzBDQUVxQixBLEdBQUcsQSxHQUFHLEEsU0FBb0I7VUFBWCxBQUFXLDJFQUFKLEFBQUksQUFDOUM7O2FBQU8sS0FBSyxBQUFMLFlBQ0wsQUFESyx5QkFFTCxBQUZLLEdBR0wsQUFISyxHQUlMLEFBSkssU0FLTCxzQkFBYyxBQUFkLElBQWtCLEVBQUUsS0FBSyxBQUFQLFNBQWdCLFVBQVUsS0FBSyxBQUEvQixBQUFsQixPQUF3RCxBQUF4RCxBQUxLLEFBQVAsQUFPRDs7OztrQ0FuQ29CLEFBQ25CO1VBQUksQ0FBRSxBQUFOLFVBQWdCLEFBQ2Q7bUJBQVcsSUFBSSxBQUFKLGFBQ1QsQUFEUyxnQkFFVCxBQUZTLEFBR1QsQUFIUyxBQUFYLEFBS0Q7QUFDRDthQUFPLEFBQVAsQUFDRDs7Ozs7RUFWcUMsOEJBQVMsQTs7a0JBQTlCLEEiLCJmaWxlIjoiTEFORFJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6Ii9Vc2Vycy9taWNoYWx0YWthYy9Qcm9qZWN0cy9kZWNlbnRyYWxhbmQvY2xpIn0=