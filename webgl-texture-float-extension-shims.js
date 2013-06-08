(function() {
  var checkColorBuffer, checkFloatLinear, checkSupport, checkTexture, createSourceCanvas, getExtension, getSupportedExtensions, name, shimExtensions, shimLookup, unshimExtensions, unshimLookup, _i, _len,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  createSourceCanvas = function() {
    var canvas, ctx, imageData;
    canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    ctx = canvas.getContext('2d');
    imageData = ctx.getImageData(0, 0, 2, 2);
    imageData.data.set(new Uint8ClampedArray([0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 0, 255, 255, 255, 255]));
    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  createSourceCanvas();

  checkFloatLinear = function(gl, sourceType) {
    var buffer, cleanup, fragmentShader, framebuffer, positionLoc, program, readBuffer, result, source, sourceCanvas, sourceLoc, target, vertexShader, vertices;
    program = gl.createProgram();
    vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.attachShader(program, vertexShader);
    gl.shaderSource(vertexShader, 'attribute vec2 position;\nvoid main(){\n    gl_Position = vec4(position, 0.0, 1.0);\n}');
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(vertexShader);
    }
    fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.attachShader(program, fragmentShader);
    gl.shaderSource(fragmentShader, 'uniform sampler2D source;\nvoid main(){\n    gl_FragColor = texture2D(source, vec2(1.0, 1.0));\n}');
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(fragmentShader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(program);
    }
    gl.useProgram(program);
    cleanup = function() {
      gl.deleteShader(fragmentShader);
      gl.deleteShader(vertexShader);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(source);
      gl.deleteTexture(target);
      gl.deleteFramebuffer(framebuffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.useProgram(null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      return gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    target = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    sourceCanvas = createSourceCanvas();
    source = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, source);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, sourceType, sourceCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    vertices = new Float32Array([1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1]);
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    positionLoc = gl.getAttribLocation(program, 'position');
    sourceLoc = gl.getUniformLocation(program, 'source');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1i(sourceLoc, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    readBuffer = new Uint8Array(4 * 4);
    gl.readPixels(0, 0, 2, 2, gl.RGBA, gl.UNSIGNED_BYTE, readBuffer);
    result = Math.abs(readBuffer[0] - 127) < 10;
    cleanup();
    return result;
  };

  checkTexture = function(gl, targetType) {
    var target;
    target = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, targetType, null);
    if (gl.getError() === 0) {
      gl.deleteTexture(target);
      return true;
    } else {
      gl.deleteTexture(target);
      return false;
    }
  };

  checkColorBuffer = function(gl, targetType) {
    var check, framebuffer, target;
    target = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, target);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, targetType, null);
    framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target, 0);
    check = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.deleteTexture(target);
    gl.deleteFramebuffer(framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (check === gl.FRAMEBUFFER_COMPLETE) {
      return true;
    } else {
      return false;
    }
  };

  shimExtensions = [];

  shimLookup = {};

  unshimExtensions = [];

  checkSupport = function() {
    var canvas, extobj, gl, halfFloatExt, halfFloatTexturing, singleFloatExt, singleFloatTexturing;
    canvas = document.createElement('canvas');
    gl = null;
    try {
      gl = canvas.getContext('experimental-webgl');
      if (gl === null) {
        gl = canvas.getContext('webgl');
      }
    } catch (_error) {}
    if (gl != null) {
      singleFloatExt = gl.getExtension('OES_texture_float');
      if (singleFloatExt === null) {
        if (checkTexture(gl, gl.FLOAT)) {
          singleFloatTexturing = true;
          shimExtensions.push('OES_texture_float');
          shimLookup.OES_texture_float = {
            shim: true
          };
        } else {
          singleFloatTexturing = false;
          unshimExtensions.push('OES_texture_float');
        }
      } else {
        if (checkTexture(gl, gl.FLOAT)) {
          singleFloatTexturing = true;
          shimExtensions.push('OES_texture_float');
        } else {
          singleFloatTexturing = false;
          unshimExtensions.push('OES_texture_float');
        }
      }
      if (singleFloatTexturing) {
        extobj = gl.getExtension('WEBGL_color_buffer_float');
        if (extobj === null) {
          if (checkColorBuffer(gl, gl.FLOAT)) {
            shimExtensions.push('WEBGL_color_buffer_float');
            shimLookup.WEBGL_color_buffer_float = {
              shim: true,
              RGBA32F_EXT: 0x8814,
              RGB32F_EXT: 0x8815,
              FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT: 0x8211,
              UNSIGNED_NORMALIZED_EXT: 0x8C17
            };
          } else {
            unshimExtensions.push('WEBGL_color_buffer_float');
          }
        } else {
          if (checkColorBuffer(gl, gl.FLOAT)) {
            shimExtensions.push('WEBGL_color_buffer_float');
          } else {
            unshimExtensions.push('WEBGL_color_buffer_float');
          }
        }
        extobj = gl.getExtension('OES_texture_float_linear');
        if (extobj === null) {
          if (checkFloatLinear(gl, gl.FLOAT)) {
            shimExtensions.push('OES_texture_float_linear');
            shimLookup.OES_texture_float_linear = {
              shim: true
            };
          } else {
            unshimExtensions.push('OES_texture_float_linear');
          }
        } else {
          if (checkFloatLinear(gl, gl.FLOAT)) {
            shimExtensions.push('OES_texture_float_linear');
          } else {
            unshimExtensions.push('OES_texture_float_linear');
          }
        }
      }
      halfFloatExt = gl.getExtension('OES_texture_half_float');
      if (halfFloatExt === null) {
        if (checkTexture(gl, 0x8D61)) {
          halfFloatTexturing = true;
          shimExtensions.push('OES_texture_half_float');
          halfFloatExt = shimLookup.OES_texture_half_float = {
            HALF_FLOAT_OES: 0x8D61,
            shim: true
          };
        } else {
          halfFloatTexturing = false;
          unshimExtensions.push('OES_texture_half_float');
        }
      } else {
        if (checkTexture(gl, halfFloatExt.HALF_FLOAT_OES)) {
          halfFloatTexturing = true;
          shimExtensions.push('OES_texture_half_float');
        } else {
          halfFloatTexturing = false;
          unshimExtensions.push('OES_texture_half_float');
        }
      }
      if (halfFloatTexturing) {
        extobj = gl.getExtension('EXT_color_buffer_half_float');
        if (extobj === null) {
          if (checkColorBuffer(gl, halfFloatExt.HALF_FLOAT_OES)) {
            shimExtensions.push('EXT_color_buffer_half_float');
            shimLookup.EXT_color_buffer_half_float = {
              shim: true,
              RGBA16F_EXT: 0x881A,
              RGB16F_EXT: 0x881B,
              FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE_EXT: 0x8211,
              UNSIGNED_NORMALIZED_EXT: 0x8C17
            };
          } else {
            unshimExtensions.push('EXT_color_buffer_half_float');
          }
        } else {
          if (checkColorBuffer(gl, halfFloatExt.HALF_FLOAT_OES)) {
            shimExtensions.push('EXT_color_buffer_half_float');
          } else {
            unshimExtensions.push('EXT_color_buffer_half_float');
          }
        }
        extobj = gl.getExtension('OES_texture_half_float_linear');
        if (extobj === null) {
          if (checkFloatLinear(gl, halfFloatExt.HALF_FLOAT_OES)) {
            shimExtensions.push('OES_texture_half_float_linear');
            return shimLookup.OES_texture_half_float_linear = {
              shim: true
            };
          } else {
            return unshimExtensions.push('OES_texture_half_float_linear');
          }
        } else {
          if (checkFloatLinear(gl, halfFloatExt.HALF_FLOAT_OES)) {
            return shimExtensions.push('OES_texture_half_float_linear');
          } else {
            return unshimExtensions.push('OES_texture_half_float_linear');
          }
        }
      }
    }
  };

  if (window.WebGLRenderingContext != null) {
    checkSupport();
    unshimLookup = {};
    for (_i = 0, _len = unshimExtensions.length; _i < _len; _i++) {
      name = unshimExtensions[_i];
      unshimLookup[name] = true;
    }
    getExtension = WebGLRenderingContext.prototype.getExtension;
    WebGLRenderingContext.prototype.getExtension = function(name) {
      var extobj;
      extobj = shimLookup[name];
      if (extobj === void 0) {
        if (unshimLookup[name]) {
          return null;
        } else {
          return getExtension.call(this, name);
        }
      } else {
        return extobj;
      }
    };
    getSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
    WebGLRenderingContext.prototype.getSupportedExtensions = function() {
      var extension, result, supported, _j, _k, _len1, _len2;
      supported = getSupportedExtensions.call(this);
      result = [];
      for (_j = 0, _len1 = supported.length; _j < _len1; _j++) {
        extension = supported[_j];
        if (unshimLookup[extension] === void 0) {
          result.push(extension);
        }
      }
      for (_k = 0, _len2 = shimExtensions.length; _k < _len2; _k++) {
        extension = shimExtensions[_k];
        if (__indexOf.call(result, extension) < 0) {
          result.push(extension);
        }
      }
      return result;
    };
    WebGLRenderingContext.prototype.getFloatExtension = function(spec) {
      var candidate, candidates, half, halfFramebuffer, halfLinear, halfTexture, i, importance, preference, result, single, singleFramebuffer, singleLinear, singleTexture, use, _j, _k, _l, _len1, _len2, _len3, _len4, _m, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
      if ((_ref = spec.prefer) == null) {
        spec.prefer = ['half'];
      }
      if ((_ref1 = spec.require) == null) {
        spec.require = [];
      }
      if ((_ref2 = spec.throws) == null) {
        spec.throws = true;
      }
      singleTexture = this.getExtension('OES_texture_float');
      halfTexture = this.getExtension('OES_texture_half_float');
      singleFramebuffer = this.getExtension('WEBGL_color_buffer_float');
      halfFramebuffer = this.getExtension('EXT_color_buffer_half_float');
      singleLinear = this.getExtension('OES_texture_float_linear');
      halfLinear = this.getExtension('OES_texture_half_float_linear');
      single = {
        texture: singleTexture !== null,
        filterable: singleLinear !== null,
        renderable: singleFramebuffer !== null,
        score: 0,
        precision: 'single',
        half: false,
        single: true,
        type: this.FLOAT
      };
      half = {
        texture: halfTexture !== null,
        filterable: halfLinear !== null,
        renderable: halfFramebuffer !== null,
        score: 0,
        precision: 'half',
        half: true,
        single: false,
        type: (_ref3 = halfTexture != null ? halfTexture.HALF_FLOAT_OES : void 0) != null ? _ref3 : null
      };
      candidates = [];
      if (single.texture) {
        candidates.push(single);
      }
      if (half.texture) {
        candidates.push(half);
      }
      result = [];
      for (_j = 0, _len1 = candidates.length; _j < _len1; _j++) {
        candidate = candidates[_j];
        use = true;
        _ref4 = spec.require;
        for (_k = 0, _len2 = _ref4.length; _k < _len2; _k++) {
          name = _ref4[_k];
          if (candidate[name] === false) {
            use = false;
          }
        }
        if (use) {
          result.push(candidate);
        }
      }
      for (_l = 0, _len3 = result.length; _l < _len3; _l++) {
        candidate = result[_l];
        _ref5 = spec.prefer;
        for (i = _m = 0, _len4 = _ref5.length; _m < _len4; i = ++_m) {
          preference = _ref5[i];
          importance = Math.pow(2, spec.prefer.length - i - 1);
          if (candidate[preference]) {
            candidate.score += importance;
          }
        }
      }
      result.sort(function(a, b) {
        if (a.score === b.score) {
          return 0;
        } else if (a.score < b.score) {
          return 1;
        } else if (a.score > b.score) {
          return -1;
        }
      });
      if (result.length === 0) {
        if (throws) {
          throw 'No floating point texture support that is ' + spec.require.join(', ');
        } else {
          return null;
        }
      } else {
        result = result[0];
        return {
          filterable: result.filterable,
          renderable: result.renderable,
          type: result.type,
          precision: result.precision
        };
      }
    };
  }

}).call(this);
