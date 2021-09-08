import
{
	Cartesian3,
	Cartographic,
	Color,
	defined,
	HorizontalOrigin,
	Ion,
	Math as CesiumMath,
	OpenStreetMapImageryProvider,
	PointPrimitiveCollection,
	SceneMode,
	ScreenSpaceEventHandler,
	ScreenSpaceEventType,
	VerticalOrigin,
	Viewer
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./index.css";


/**
 * Adds points as PointPrimitiveCollection initialized from CZML data
 * 
 * @param {CZML object} czml CZML data array parsed from WebSocket JSON answer
 */
function addPointsAsCollection(czml)
{
	if(points == null)
	{
		points = viewer.scene.primitives.add(new PointPrimitiveCollection());
	}

	for(var i = 0; i < czml.length; i++)
	{
		if
		(
			!czml[i].hasOwnProperty("position") ||
			!czml[i].position.hasOwnProperty("cartographicDegrees") ||
			!czml[i].hasOwnProperty("point") ||
			!czml[i].point.hasOwnProperty("color") ||
			!czml[i].point.color.hasOwnProperty("rgba")
		)
		{
			continue;
		}

		var pos = Cartesian3.fromDegrees
		(
			czml[i].position.cartographicDegrees[0],
			czml[i].position.cartographicDegrees[1],
			czml[i].position.cartographicDegrees[2]
		);

		var color = new Color
		(
			czml[i].point.color.rgba[0],
			czml[i].point.color.rgba[1],
			czml[i].point.color.rgba[2],
			czml[i].point.color.rgba[3]
		);

		points.add
		({
			position: pos,
			pixelSize: 10,
			color: color,
			outlineColor: color
		});
	}
}



/**
 * Handles the onmessage event of the asset WebSocket
 * 
 * @param {MessageEvent} WebSocket onmessage event 
 */
function assetSocketOnMessage(event)
{
	var czml = null;

	try
	{
		czml = JSON.parse(event.data);
		addPointsAsCollection(czml);
	}
	catch(ex) {}
};



/**
 * Creates a tool tip label when the mouse hovers above an asset
 */
function inputActionDef(movement)
{
	var foundPosition = false;

	var scene = viewer.scene;

	// picking implemented according to "Pick position" Sandcastle
	// https://sandcastle.cesium.com/?src=Picking.html
	if (scene.mode !== SceneMode.MORPHING)
	{
		var pickedObject = scene.pick(movement.endPosition);

		if
		(
			scene.pickPositionSupported &&
			defined(pickedObject)
		)
		{
			var cartesian = scene.pickPosition(movement.endPosition);

			if(defined(cartesian))
			{
				var cartographic = Cartographic.fromCartesian(cartesian);
				var longitudeString = CesiumMath.toDegrees(cartographic.longitude).toFixed(2);
				var latitudeString = CesiumMath.toDegrees(cartographic.latitude).toFixed(2);
				var heightString = cartographic.height.toFixed(2);

				labelEntity.position = cartesian;
				labelEntity.label.show = true;
				labelEntity.label.text =
					"Lon: " + ("   " + longitudeString).slice(-7) + "\u00B0" +
					"\nLat: " + ("   " + latitudeString).slice(-7) + "\u00B0" +
					"\nAlt: " + ("   " + heightString).slice(-7) + "m";
				
				labelEntity.label.eyeOffset = new Cartesian3
				(
					0.0,
					0.0,
					-cartographic.height * (scene.mode === SceneMode.SCENE2D ? 1.5 : 1.0)
				);

				foundPosition = true;
			}
		}
	}

	if (!foundPosition)
	{
		labelEntity.label.show = false;
	}
}



Ion.defaultAccessToken = "";

var viewer = new Viewer("cesiumContainer",
{
	animation: false,
	baseLayerPicker: false,
	geocoder: false,
	imageryProvider: new OpenStreetMapImageryProvider({ url : "https://a.tile.openstreetmap.org/" }),
	sceneModePicker: false,
	timeline: false
});

viewer.scene.debugShowFramesPerSecond = true;
viewer.scene.postProcessStages.fxaa.enabled = false;

var points = null;

var labelEntity = viewer.entities.add
({
	label:
	{
		show: false,
		showBackground: true,
		font: "14px monospace",
		verticalOrigin : VerticalOrigin.BOTTOM,
		horizontalOrigin: HorizontalOrigin.LEFT,
	},
});

var handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
handler.setInputAction(inputActionDef, ScreenSpaceEventType.MOUSE_MOVE);

var assetSocket = new WebSocket("ws://localhost:4040/asset");
assetSocket.onmessage = function(event) { assetSocketOnMessage(event); }

assetSocket.addEventListener("open", function(event)
{
	assetSocket.send("teapot");
});
