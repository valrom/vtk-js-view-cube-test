import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkConeSource from '@kitware/vtk.js/Filters/Sources/ConeSource';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager';
import vtkPolyLineWidget from '@kitware/vtk.js/Widgets/Widgets3D/PolyLineWidget'

import {
    createInteractiveOrientationMarkerWidget,
    alignCameraOnViewWidgetOrientationChange,
} from '@kitware/vtk.js/Widgets/Widgets3D/InteractiveOrientationWidget/helpers';
import vtkGenericRenderWindow from "@kitware/vtk.js/Rendering/Misc/GenericRenderWindow";

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader';
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction';
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction';
import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';

// ----------------------------------------------------------------------------
// Standard rendering code setup
// ----------------------------------------------------------------------------

const fullScreenRenderer = vtkGenericRenderWindow.newInstance({
    background: [0.2, 0.2, 0.2],
});

fullScreenRenderer.setContainer(document.getElementById('vtk-render'))
fullScreenRenderer.resize()


const renderer = fullScreenRenderer.getRenderer();
const renderWindow = fullScreenRenderer.getRenderWindow();
const render = renderWindow.render;
const renderWindowInteractor = renderWindow.getInteractor();

// ----------------------------------------------------------------------------
// Add context to 3D scene for orientation
// ----------------------------------------------------------------------------

const cone = vtkConeSource.newInstance();
const mapper = vtkMapper.newInstance();
const actor = vtkActor.newInstance({pickable: false});

actor.setMapper(mapper);
mapper.setInputConnection(cone.getOutputPort());
renderer.addActor(actor);

const camera = renderer.getActiveCamera();

// ----------------------------------------------------------------------------
// Widget manager
// ----------------------------------------------------------------------------
const widgetManager = vtkWidgetManager.newInstance();

const {interactiveOrientationWidget, orientationMarkerWidget} =
    createInteractiveOrientationMarkerWidget(
        widgetManager,
        renderWindowInteractor,
        renderer
    );

orientationMarkerWidget.setViewportSize(0.2)

const vw = widgetManager.addWidget(interactiveOrientationWidget);

const subscription = alignCameraOnViewWidgetOrientationChange(
    vw,
    camera,
    orientationMarkerWidget,
    widgetManager,
    render
);

const mainWidgetManager = vtkWidgetManager.newInstance()
mainWidgetManager.setRenderer(renderer)

renderer.resetCamera();
widgetManager.enablePicking();
mainWidgetManager.enablePicking()

const {reader, actor: volumeActor} = createVolumeActor()

await reader.setUrl('https://kitware.github.io/vtk-js/data/volume/headsq.vti')
await reader.loadData()

renderer.addVolume(volumeActor)
const interactor = renderWindow.getInteractor();
renderer.resetCamera();
renderer.getActiveCamera().elevation(80)

render();

const widgetButton = document.getElementById('widget')

widgetButton.addEventListener('click', () => {
    const widget = vtkPolyLineWidget.newInstance()

    widget.placeWidget(cone.getOutputData().getBounds())


    mainWidgetManager.addWidget(widget)
    mainWidgetManager.grabFocus(widget)
})

function createVolumeActor() {
    const reader = vtkHttpDataSetReader.newInstance({fetchGzip: true});

    const actor = vtkVolume.newInstance();
    const mapper = vtkVolumeMapper.newInstance();
    // Increased render time
    mapper.setSampleDistance(0.08);
    actor.setMapper(mapper);

    // create color and opacity transfer functions
    const ctfun = vtkColorTransferFunction.newInstance();
    ctfun.addRGBPoint(200.0, 0.4, 0.2, 0.0);
    ctfun.addRGBPoint(2000.0, 1.0, 1.0, 1.0);
    const ofun = vtkPiecewiseFunction.newInstance();
    ofun.addPoint(200.0, 0.0);
    ofun.addPoint(1200.0, 0.5);
    ofun.addPoint(3000.0, 0.8);
    actor.getProperty().setRGBTransferFunction(0, ctfun);
    actor.getProperty().setScalarOpacity(0, ofun);
    actor.getProperty().setScalarOpacityUnitDistance(0, 4.5);
    actor.getProperty().setInterpolationTypeToLinear();
    actor.getProperty().setUseGradientOpacity(0, true);
    actor.getProperty().setGradientOpacityMinimumValue(0, 15);
    actor.getProperty().setGradientOpacityMinimumOpacity(0, 0.0);
    actor.getProperty().setGradientOpacityMaximumValue(0, 100);
    actor.getProperty().setGradientOpacityMaximumOpacity(0, 1.0);
    actor.getProperty().setShade(true);
    actor.getProperty().setAmbient(0.2);
    actor.getProperty().setDiffuse(0.7);
    actor.getProperty().setSpecular(0.3);
    actor.getProperty().setSpecularPower(8.0);

    mapper.setInputConnection(reader.getOutputPort());

    return {
        reader,
        actor
    }
}