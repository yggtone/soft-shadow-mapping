(function() {
  var Filter, animate, boxFilter, camDist, camPitch, camProj, camRot, camView, canvas, container, controls, counter, cubeGeom, displayShader, downsample128, downsample64, draw, drawCamera, drawLight, drawScene, floatExt, fullscreenImg, gl, hover, lightDepthTexture, lightFramebuffer, lightProj, lightRot, lightShader, lightView, model, mousemove, mouseup, name, offset, planeGeom, quad;

  name = 'esm-filtered-shadow';

  document.write("<div id=\"" + name + "\" class=\"example\"></div>");

  container = $('#' + name);

  canvas = $('<canvas></canvas>').appendTo(container)[0];

  try {
    gl = new WebGLFramework(canvas).depthTest();
    floatExt = gl.getFloatExtension({
      require: ['renderable', 'filterable']
    });
    gl.getExt('OES_standard_derivatives');
  } catch (error) {
    container.empty();
    $('<div class="error"></div>').text(error).appendTo(container);
    $('<div class="error-info"></div>').text('(screenshot instead)').appendTo(container);
    $("<img src=\"" + name + ".png\">").appendTo(container);
    return;
  }

  fullscreenImg = $('<img class="toggle-fullscreen" src="fullscreen.png">').appendTo(container).click(function() {
    return gl.toggleFullscreen(container[0]);
  });

  gl.onFullscreenChange(function(isFullscreen) {
    if (isFullscreen) {
      container.addClass('fullscreen');
      return fullscreenImg.attr('src', 'exit-fullscreen.png');
    } else {
      container.removeClass('fullscreen');
      return fullscreenImg.attr('src', 'fullscreen.png');
    }
  });

  hover = false;

  container.hover((function() {
    return hover = true;
  }), (function() {
    return hover = false;
  }));

  animate = true;

  controls = $('<div class="controls"></div>').appendTo(container);

  $('<label>Animate</label>').appendTo(controls);

  $('<input type="checkbox" checked="checked"></input>').appendTo(controls).change(function() {
    return animate = this.checked;
  });

  cubeGeom = gl.drawable(meshes.cube);

  planeGeom = gl.drawable(meshes.plane(50));

  quad = gl.drawable(meshes.quad);

  displayShader = gl.shader({
    common: '#line 56 vsm-filtered-shadow.coffee\nvarying vec3 vWorldNormal; varying vec4 vWorldPosition;\nuniform mat4 camProj, camView;\nuniform mat4 lightProj, lightView; uniform mat3 lightRot;\nuniform mat4 model;',
    vertex: '#line 62 vsm-filtered-shadow.coffee\nattribute vec3 position, normal;\n\nvoid main(){\n    vWorldNormal = normal;\n    vWorldPosition = model * vec4(position, 1.0);\n    gl_Position = camProj * camView * vWorldPosition;\n}',
    fragment: '#line 71 vsm-filtered-shadow.coffee\nuniform sampler2D sLightDepth;\n\nfloat linstep(float low, float high, float v){\n    return clamp((v-low)/(high-low), 0.0, 1.0);\n}\n\nfloat VSM(sampler2D depths, vec2 uv, float compare){\n    vec2 moments = texture2D(depths, uv).xy;\n    float p = smoothstep(compare-0.02, compare, moments.x);\n    float variance = max(moments.y - moments.x*moments.x, -0.001);\n    float d = compare - moments.x;\n    float p_max = linstep(0.2, 1.0, variance / (variance + d*d));\n    return clamp(max(p, p_max), 0.0, 1.0);\n}\n\nfloat attenuation(vec3 dir){\n    float dist = length(dir);\n    float radiance = 1.0/(1.0+pow(dist/10.0, 2.0));\n    return clamp(radiance*10.0, 0.0, 1.0);\n}\n\nfloat influence(vec3 normal, float coneAngle){\n    float minConeAngle = ((360.0-coneAngle-10.0)/360.0)*PI;\n    float maxConeAngle = ((360.0-coneAngle)/360.0)*PI;\n    return smoothstep(minConeAngle, maxConeAngle, acos(normal.z));\n}\n\nfloat lambert(vec3 surfaceNormal, vec3 lightDirNormal){\n    return max(0.0, dot(surfaceNormal, lightDirNormal));\n}\n\nvec3 skyLight(vec3 normal){\n    return vec3(smoothstep(0.0, PI, PI-acos(normal.y)))*0.4;\n}\n\nvec3 gamma(vec3 color){\n    return pow(color, vec3(2.2));\n}\n\nvoid main(){\n    vec3 worldNormal = normalize(vWorldNormal);\n\n    vec3 camPos = (camView * vWorldPosition).xyz;\n    vec3 lightPos = (lightView * vWorldPosition).xyz;\n    vec3 lightPosNormal = normalize(lightPos);\n    vec3 lightSurfaceNormal = lightRot * worldNormal;\n    vec4 lightDevice = lightProj * vec4(lightPos, 1.0);\n    vec2 lightDeviceNormal = lightDevice.xy/lightDevice.w;\n    vec2 lightUV = lightDeviceNormal*0.5+0.5;\n\n    // shadow calculation\n    float lightDepth2 = clamp(length(lightPos)/40.0, 0.0, 1.0);\n'+
//esm version
'float darkness = 40.0;\nfloat sdepth = texture2D(sLightDepth, lightUV).x; \n float illuminated = exp( darkness* (sdepth - lightDepth2)); \n illuminated = clamp(illuminated,0.0,1.0); '

+'\n    vec3 excident = (\n        skyLight(worldNormal) +\n        lambert(lightSurfaceNormal, -lightPosNormal) *\n        influence(lightPosNormal, 55.0) *\n        attenuation(lightPos) *\n        illuminated\n    );\n'    
+
'gl_FragColor = vec4(gamma(excident), 1.0);\n}'

  });

  lightShader = gl.shader({
    common: '#line 138 vsm-filtered-shadow.coffee\nvarying vec3 vWorldNormal; varying vec4 vWorldPosition;\nuniform mat4 lightProj, lightView; uniform mat3 lightRot;\nuniform mat4 model;',
    vertex: '#line 143 vsm-filtered-shadow.coffee\nattribute vec3 position, normal;\n\nvoid main(){\n    vWorldNormal = normal;\n    vWorldPosition = model * vec4(position, 1.0);\n    gl_Position = lightProj * lightView * vWorldPosition;\n}',
    fragment: '#line 152 vsm-filtered-shadow.coffee\n#extension GL_OES_standard_derivatives : enable\nvoid main(){\n    vec3 worldNormal = normalize(vWorldNormal);\n    vec3 lightPos = (lightView * vWorldPosition).xyz;\n    float depth = clamp(length(lightPos)/40.0, 0.0, 1.0);\n    float dx = dFdx(depth);\n    float dy = dFdy(depth);\n    gl_FragColor = vec4(depth, pow(depth, 2.0) + 0.25*(dx*dx + dy*dy), 0.0, 1.0);\n}'
  });

  lightDepthTexture = gl.texture({
    type: floatExt.type,
    channels: 'rgba'
  }).bind().setSize(256, 256).linear().clampToEdge();

  lightFramebuffer = gl.framebuffer().bind().color(lightDepthTexture).depth().unbind();

  Filter = (function() {

    function Filter(size, filter) {
      this.size = size;
      this.output = gl.texture({
        type: floatExt.type,
        channels: 'rgba'
      }).bind().setSize(this.size, this.size).linear().clampToEdge();
      this.framebuffer = gl.framebuffer().bind().color(this.output).unbind();
      this.shader = gl.shader({
        common: '#line 174 vsm-filtered-shadow.coffee\nvarying vec2 texcoord;',
        vertex: '#line 177 vsm-filtered-shadow.coffee\nattribute vec2 position;\n\nvoid main(){\n    texcoord = position*0.5+0.5;\n    gl_Position = vec4(position, 0.0, 1.0);\n}',
        fragment: "#line 186 vsm-filtered-shadow.coffee\nuniform vec2 viewport;\nuniform sampler2D source;\n\nvec3 get(float x, float y){\n    vec2 off = vec2(x, y);\n    return texture2D(source, texcoord+off/viewport).rgb;\n}\nvec3 get(int x, int y){\n    vec2 off = vec2(x, y);\n    return texture2D(source, texcoord+off/viewport).rgb;\n}\nvec3 filter(){\n    " + filter + "\n}\nvoid main(){\n    gl_FragColor = vec4(filter(), 1.0);\n}"
      });
    }

    Filter.prototype.bind = function(unit) {
      return this.output.bind(unit);
    };

    Filter.prototype.apply = function(source) {
      this.framebuffer.bind();
      gl.viewport(0, 0, this.size, this.size);
      this.shader.use().vec2('viewport', this.size, this.size).sampler('source', source).draw(quad);
      return this.framebuffer.unbind();
    };

    return Filter;

  })();

  downsample128 = new Filter(128, '#line 216 vsm-filtered-shadow.coffee\nreturn get(0.0, 0.0);');

  downsample64 = new Filter(64, '#line 220 vsm-filtered-shadow.coffee\nreturn get(0.0, 0.0);');

  boxFilter = new Filter(64, '#line 224 vsm-filtered-shadow.coffee\nvec3 result = vec3(0.0);\nfor(int x=-1; x<=1; x++){\n    for(int y=-1; y<=1; y++){\n        result += get(x,y);\n    }\n}\nreturn result/9.0;');

  camProj = gl.mat4();

  camView = gl.mat4();

  lightProj = gl.mat4().perspective({
    fov: 60
  }, 1, {
    near: 0.01,
    far: 100
  });

  lightView = gl.mat4().trans(0, 0, -6).rotatex(30).rotatey(110);

  lightRot = gl.mat3().fromMat4Rot(lightView);

  model = gl.mat4();

  counter = -Math.PI * 0.5;

  offset = 0;

  camDist = 10;

  camRot = 55;

  camPitch = 41;

  mouseup = function() {
    return $(document).unbind('mousemove', mousemove).unbind('mouseup', mouseup);
  };

  mousemove = function(_arg) {
    var originalEvent, x, y, _ref, _ref1, _ref2, _ref3, _ref4, _ref5;
    originalEvent = _arg.originalEvent;
    x = (_ref = (_ref1 = (_ref2 = originalEvent.movementX) != null ? _ref2 : originalEvent.webkitMovementX) != null ? _ref1 : originalEvent.mozMovementX) != null ? _ref : originalEvent.oMovementX;
    y = (_ref3 = (_ref4 = (_ref5 = originalEvent.movementY) != null ? _ref5 : originalEvent.webkitMovementY) != null ? _ref4 : originalEvent.mozMovementY) != null ? _ref3 : originalEvent.oMovementY;
    camRot += x;
    camPitch += y;
    if (camPitch > 85) {
      return camPitch = 85;
    } else if (camPitch < 1) {
      return camPitch = 1;
    }
  };

  $(canvas).bind('mousedown', function() {
    $(document).bind('mousemove', mousemove).bind('mouseup', mouseup);
    return false;
  }).bind('mousewheel', function(_arg) {
    var originalEvent;
    originalEvent = _arg.originalEvent;
    camDist -= originalEvent.wheelDeltaY / 250;
    return false;
  }).bind('DOMMouseScroll', function(_arg) {
    var originalEvent;
    originalEvent = _arg.originalEvent;
    camDist += originalEvent.detail / 5;
    return false;
  });

  drawScene = function(shader) {
    return shader.mat4('model', model.ident().trans(0, 0, 0)).draw(planeGeom).mat4('model', model.ident().trans(0, 1 + offset, 0)).draw(cubeGeom).mat4('model', model.ident().trans(5, 1, -1)).draw(cubeGeom).mat4('model', model.scale(0.25).trans(2, 2, 14)).draw(cubeGeom).
   mat4('model', model.scale(8).trans(1.5, 0, 0)).draw(cubeGeom);
  };

  drawLight = function() {
    lightFramebuffer.bind();
    gl.viewport(0, 0, lightDepthTexture.width, lightDepthTexture.height).clearColor(1, 1, 1, 1).clearDepth(1).cullFace('back');
    lightShader.use().mat4('lightView', lightView).mat4('lightProj', lightProj).mat3('lightRot', lightRot);
    drawScene(lightShader);
    lightFramebuffer.unbind();
    downsample128.apply(lightDepthTexture);
    downsample64.apply(downsample128);
    return boxFilter.apply(downsample64);
  };

  drawCamera = function() {
    gl.adjustSize().viewport().cullFace('back').clearColor(0, 0, 0, 0).clearDepth(1);
    camProj.perspective({
      fov: 60,
      aspect: gl.aspect,
      near: 0.01,
      far: 100
    });
    camView.ident().trans(0, -1, -camDist).rotatex(camPitch).rotatey(camRot);
    displayShader.use().mat4('camProj', camProj).mat4('camView', camView).mat4('lightView', lightView).mat4('lightProj', lightProj).mat3('lightRot', lightRot).sampler('sLightDepth', boxFilter);
    return drawScene(displayShader);
  };

  draw = function() {
    drawLight();
    return drawCamera();
  };

  draw();

  gl.animationInterval(function() {
    if (hover) {
      if (animate) {
        offset = 1 + Math.sin(counter);
        counter += 1 / 30;
      } else {
        offset = 0;
      }
      return draw();
    }
  });

}).call(this);
