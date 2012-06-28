function AsyncArray(base){
	if(!Array.isArray(base)){
		if(arguments.length >= 0){
			base = Array.prototype.slice.call(arguments, 0);
		} else {
			base = [];
		}
	}

	this._funcs = [];
	this._base = base;
	this._running = false;
	this._stopped = false;
	this.length = base.length; //the current number of elements

	//call all functions on next tick
	var _that = this;
	process.nextTick(function(){
		_that.running = true;
		base.forEach(_that.getFuncRunner());
	});
}

AsyncArray.prototype.getFuncRunner = function(){
	var _that = this;
	return function runFuncs(elem, elemIndex, funcIndex){
		if(typeof funcIndex !== "number") funcIndex = 0;
		if(_that._funcs.length <= funcIndex || _that._stopped) return; //done!
		_that._funcs[funcIndex](elem, elemIndex, function(err, elem, elemIndex){
			if(err){
				if(_that.errorHandler) _that.errorHandler(err);
				else throw err;
				_that._stopped = true;
			}
			else runFuncs(elem, elemIndex, funcIndex + 1);
		});
	};
};

AsyncArray.prototype.error = function(func){
	this.errorHandler = func;
	return this;
};

AsyncArray.prototype.stop = function(){
	this._stopped = true;
	return this;
};

AsyncArray.prototype.forEach = function(func){
	this._funcs.push(function(elem, index, next){
		func(elem, index);
		next(null, elem, index);
	});
	return this;
};

AsyncArray.prototype.map = function(func){
	this._funcs.push(function(elem, index, next){
		func(elem, index, function(err, result){
			next(err, result, index);
		});
	});
	return this;
};

AsyncArray.prototype.some = function(func, cb){
	var called = false,
	    checked = 0,
	    _that = this;

	this._funcs.push(function(elem, index, next){
		func(elem, index, function(err, result){
			if(called) return;

			if(err || result){
				cb(err, result);
				called = true;
			} else {
				if(++checked === _that.length + 1){
					cb(null, false);
					called = true;
				}
			}
		});
		//call the next function right now
		next(null, elem, index);
	});
	return this;
};

AsyncArray.prototype.every = function(func, cb){
	var called = false,
	    checked = 0,
	    _that = this;

	this._funcs.push(function(elem, index, next){
		func(elem, index, function(err, result){
			if(called) return;

			if(err || !result){
				cb(err, result);
				called = true;
			} else {
				if(++checked === _that.length + 1){
					cb(null, true);
					called = true;
				}
			}
		});
		//call the next function right now
		next(null, elem, index);
	});
	return this;
};

AsyncArray.prototype.filter = function(func){
	//.filter destroys the order (to avoid holes)
	//use .order upfront to avoid this
	var _that = this, curIndex = 0;
	this._funcs.push(function(elem, index, next){
		func(elem, index, function(err, result){
			if(err || result) return next(err, elem, curIndex++);
			else {
				_that.length -= 1;
			}
		});
	});
};

AsyncArray.prototype.push = function(){
	if(!this._running){
		this.length = Array.prototype.push.apply(this._base, arguments);
	} else {
		var runFuncs = this.getFuncRunner();
		for(var i = 0, j = arguments.length; i < j; i++){
			//run all functions for all elements
			runFuncs(arguments[i], this.length++, 0);
		}
	}
	return this.length;
};

AsyncArray.prototype.order = function(){
	//perform the next action with all items in order
	var stack = {};
	var lastIndex = -1;
	this._funcs.push(function(elem, index, next){
		if(index === lastIndex + 1){
			next(null, elem, index);
			while(++index in stack){
				next(null, stack[index], index);
				stack[index] = null; //help GC
			}
		} else {
			stack[index] = elem;
		}
	});
	return this;
};

//.flatten needs to be called after .order, or the order will be destroyed
AsyncArray.prototype.flatten = function(){
	var curIndex = 0, _that = this;
	this._funcs.push(function(elem, index, next){
		if(!Array.isArray(elem)) return next(null, elem, curIndex++);

		if(elem.length === 0){
			_that.length -= 1;
			return;
		}

		for(var i = 0, j = elem.length; i < j; i++){
			next(null, elem[i], curIndex++);
			if(i !== 0) _that.length += 1;
		}
	});
	return this;
};

AsyncArray.prototype.flattenDeep = function(){
	var curIndex = 0, _that = this;
	this._funcs.push(function(elem, index, next){
		if(!Array.isArray(elem)) return next(null, elem, curIndex++);

		//this needs to be done recursively
		(function flatten(arr){

			if(arr.length === 0){
				_that.length -= 1;
				return;
			}

			for(var i = 0, j = arr.length; i < j; i++){
				if(Array.isArray(arr[i])) flatten(arr[i]);
				else next(null, arr[i], curIndex++);

				if(i !== 0) _that.length += 1;
			}
		}(elem));
	});
	return this;
};

AsyncArray.prototype.pluck = function(name){
	this._funcs.push(function(elem, index, next){
		next(null, elem[name], index);
	});
	return this;
};

AsyncArray.prototype.toArray = function(cb){
	this.order(); //required to makes this work
	var ret = [], _that = this;
	this._funcs.push(function(elem, index, next){
		//request _that.length on every run to ensure .flatten* works
		if(index === _that.length - 1) cb(null, ret);
		else ret.push(elem);
		next(null, elem, index);
	});
};

module.exports = AsyncArray;