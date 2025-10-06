// app.js (corregido)

function activeMenuOption(href) {
    $(".app-menu .nav-link")
        .removeClass("active")
        .removeAttr("aria-current");

    $(`[href="${(href ? href : "#/")}"]`)
        .addClass("active")
        .attr("aria-current", "page");
}

const app = angular.module("angularjsApp", ["ngRoute"]);

app.config(function ($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix("");

    $routeProvider
        .when("/", {
            templateUrl: "/app",
            controller: "appCtrl"
        })
        .when("/integrantes", {
            templateUrl: "/integrantes",
            controller: "integrantesCtrl"
        })
        .when("/equiposintegrantes", {
            templateUrl: "/equiposintegrantes",
            controller: "equiposintegrantesCtrl"
        })
        .when("/equipos", {
            templateUrl: "/equipos",
            controller: "equiposCtrl"
        })
        .when("/proyectos", {
            templateUrl: "/proyectos",
            controller: "proyectosCtrl"
        })
        .when("/proyectosavances", {
            templateUrl: "/proyectosavances",
            controller: "proyectosavancesCtrl"
        })
        .otherwise({
            redirectTo: "/"
        });
});

app.run(["$rootScope", "$location", "$timeout", function($rootScope, $location, $timeout) {
    function actualizarFechaHora() {
        // DateTime debe existir (luxon). lxFechaHora es global en este scope.
        lxFechaHora = DateTime.now().setLocale("es");
        $rootScope.angularjsHora = lxFechaHora.toFormat("hh:mm:ss a");
        $timeout(actualizarFechaHora, 1000);
    }

    $rootScope.slide = "";

    actualizarFechaHora();

    $rootScope.$on("$routeChangeSuccess", function (event, current, previous) {
        $("html").css("overflow-x", "hidden");

        const path = current && current.$$route ? current.$$route.originalPath : "/";

        if (path.indexOf("splash") === -1) {
            const active = $(".app-menu .nav-link.active").parent().index();
            const click  = $(`[href^="#${path}"]`).parent().index();

            if (active !== click) {
                $rootScope.slide = "animate__animated animate__faster animate__slideIn";
                $rootScope.slide += ((active > click) ? "Left" : "Right");
            }

            $timeout(function () {
                $("html").css("overflow-x", "auto");
                $rootScope.slide = "";
            }, 1000);

            activeMenuOption(`#${path}`);
        }
    });
}]);

///////////////// App Controller
app.controller("appCtrl", function ($scope, $http) {
    $("#frmInicioSesion").submit(function (event) {
        event.preventDefault();

        $.post("iniciarSesion", $(this).serialize(), function (respuesta) {
            if (respuesta && respuesta.length) {
                window.location = "/#/integrantes";
                return;
            }

            alert("Usuario y/o Contraseña Incorrecto(s)");
        }).fail(function () {
            alert("Error al iniciar sesión");
        });
    });
});

///////////////// integrantes controller
app.controller("integrantesCtrl", function ($scope, $http) {
    function buscarIntegrantes() {
        $.get("/tbodyIntegrantes", function (trsHTML) {
            $("#tbodyIntegrantes").html(trsHTML);
        }).fail(function () {
            console.log("Error al cargar integrantes");
        });
    }

    buscarIntegrantes();

    Pusher.logToConsole = true;

    var pusher = new Pusher('85576a197a0fb5c211de', {
        cluster: 'us2'
    });

    var channel = pusher.subscribe("integranteschannel");
    channel.bind("integrantesevent", function(data) {
        buscarIntegrantes();
    });

    // Insertar Integrantes
    $(document).on("submit", "#frmIntegrante", function (event) {
        event.preventDefault();

        $.post("/integrante", {
            idIntegrante: "",
            nombreIntegrante: $("#txtNombreIntegrante").val()
        }).done(function () {
            buscarIntegrantes();
        }).fail(function () {
            alert("Error al guardar integrante");
        });
    });
});

// Eliminar Integrantes 
$(document).on("click", ".btnEliminarIntegrante", function () {
    const id = $(this).data("id");

    if (confirm("¿Seguro que quieres eliminar este integrante?")) {
        $.post("/integrante/eliminar", { id: id }, function () {
            $(`button[data-id='${id}']`).closest("tr").remove();
        }).fail(function () {
            alert("Error al eliminar el integrante");
        });
    }
});

///////////////// proyectos controller
app.controller("proyectosCtrl", function ($scope, $http) {

    // Función para cargar equipos en el dropdown
    function cargarEquipos() {
        $.get("/equipos/lista", function (equipos) {
            const $selectEquipo = $("#txtEquipo");
            $selectEquipo.empty();
            $selectEquipo.append('<option value="">Seleccionar equipo...</option>');

            equipos.forEach(function(equipo) {
                $selectEquipo.append(`<option value="${equipo.idEquipo}">${equipo.nombreEquipo}</option>`);
            });
        }).fail(function () {
            alert("Error al cargar equipos");
        });
    }

    function buscarProyectos() {
        $.get("/tbodyProyectos", function (trsHTML) {
            $("#tbodyProyectos").html(trsHTML);
        }).fail(function () {
            console.log("Error al cargar proyectos");
        });
    }

    // Cargar equipos al inicializar la página
    cargarEquipos();
    buscarProyectos();

    Pusher.logToConsole = true;

    var pusher = new Pusher('85576a197a0fb5c211de', {
        cluster: 'us2'
    });

    var channel = pusher.subscribe("proyectoschannel");
    channel.bind("proyectosevent", function(data) {
        buscarProyectos();
    });

    $(document).off("submit", "#frmProyectos").on("submit", "#frmProyectos", function (event) {
        event.preventDefault();

        const nombreProyecto = $("#txtNombreProyecto").val().trim();
        const equipo = $("#txtEquipo").val();
        const objetivo = $("#txtObjetivo").val().trim();
        const estado = $("#txtEstado").val().trim();

       if (!nombreProyecto) {
            alert("Por favor ingresa el nombre del proyecto");
            return;
        }
        
        if (!equipo) {
            alert("Por favor selecciona un equipo");
            return;
        }
        
        if (!objetivo) {
            alert("Por favor ingresa el objetivo");
            return;
        }
        
        if (!estado) {
            alert("Por favor ingresa el estado");
            return;
        }

        
        $.post("/proyectos", {
            idProyecto: "",
            tituloProyecto: $("#txtNombreProyecto").val(),
            idEquipo: $("#txtEquipo").val(),
            objetivo: $("#txtObjetivo").val(),
            estado: $("#txtEstado").val()
        }).done(function(response) {
            // Limpiar formulario
            $("#frmProyectos")[0].reset();

            // Recargar dropdown de equipos
            cargarEquipos();

            alert("Proyecto guardado exitosamente");
            buscarProyectos();
        }).fail(function(xhr, status, error) {
            console.log("Error:", error);
            alert("Error al guardar el proyecto");
        });
    });

    // Eliminar Proyectos
    $(document).on("click", ".btnEliminarProyecto", function () {
        const id = $(this).data("id");

        if (confirm("¿Seguro que quieres eliminar este proyecto?")) {
            $.post("/proyectos/eliminar", { id: id }, function () {
                $(`button[data-id='${id}']`).closest("tr").remove();
            }).fail(function () {
                alert("Error al eliminar el proyecto");
            });
        }
    });
});

////////////////// Equipos Controllers
app.controller("equiposCtrl", function ($scope, $http) {
    function buscarEquipos() {
        $.get("/tbodyEquipos", function (trsHTML) {
            $("#tbodyEquipos").html(trsHTML);
        }).fail(function () {
            console.log("Error al cargar equipos");
        });
    }

    buscarEquipos();

    Pusher.logToConsole = true;

    var pusher = new Pusher('85576a197a0fb5c211de', {
        cluster: 'us2'
    });

    var channel = pusher.subscribe("equiposchannel");
    channel.bind("equiposevent", function(data) {
        buscarEquipos();
    });

    $(document).on("submit", "#frmEquipo", function (event) {
        event.preventDefault();

        $.post("/equipo", {
            idEquipo: "",
            nombreEquipo: $("#txtEquipoNombre").val()
        }).done(function () {
            buscarEquipos();
        }).fail(function () {
            alert("Error al guardar equipo");
        });
    });
});

// Eliminar Equipo
$(document).on("click", ".btnEliminarEquipo", function () {
    const id = $(this).data("id");

    if (confirm("¿Seguro que quieres eliminar este Equipo?")) {
        $.post("/equipo/eliminar", { id: id }, function () {
            $(`button[data-id='${id}']`).closest("tr").remove();
        }).fail(function () {
            alert("Error al eliminar el Team");
        });
    }
});

/////////////////////////////////// equiposIntegrantes

app.controller("equiposintegrantesCtrl", function ($scope, $http) {
    // Cargar equipos en el select
    function cargarEquipos() {
        $.get("/equipos/lista", function (equipos) {
            const $selectEquipo = $("#txtEquipo");
            $selectEquipo.empty();
            $selectEquipo.append('<option value="">Seleccionar equipo...</option>');
            equipos.forEach(function (equipo) {
                $selectEquipo.append(`<option value="${equipo.idEquipo}">${equipo.nombreEquipo}</option>`);
            });
        }).fail(function () {
            alert("Error al cargar equipos");
        });
    }

    // Cargar integrantes en el select
    function cargarIntegrantes() {
        $.get("/integrantes/lista", function (integrantes) {
            const $selectIntegrante = $("#txtIntegrante");
            $selectIntegrante.empty();
            $selectIntegrante.append('<option value="">Seleccionar integrante...</option>');
            integrantes.forEach(function (integrante) {
                $selectIntegrante.append(`<option value="${integrante.idIntegrante}">${integrante.nombreIntegrante}</option>`);
            });
        }).fail(function () {
            alert("Error al cargar integrantes");
        });
    }

    // Buscar equipos-integrantes
    function buscarEquiposIntegrantes() {
        $.get("/tbodyEquiposIntegrantes", function (trsHTML) {
            $("#tbodyEquiposIntegrantes").html(trsHTML);
        }).fail(function () {
            console.log("Error al cargar equipos-integrantes");
        });
    }

    // Inicializar
    cargarEquipos();
    cargarIntegrantes();
    buscarEquiposIntegrantes();

    // Pusher
    Pusher.logToConsole = true;
    var pusher = new Pusher('85576a197a0fb5c211de', { cluster: 'us2' });
    var channel = pusher.subscribe("equiposIntegranteschannel");
    channel.bind("equiposIntegrantesevent", function (data) {
        buscarEquiposIntegrantes();
    });

    // Insertar Equipo-Integrante (ojo: id correcto del form)
    $(document).on("submit", "#frmEquipoIntegrante", function (event) {
        event.preventDefault();

        const idEquipo = $("#txtEquipo").val();
        const idIntegrante = $("#txtIntegrante").val();

        if (!idEquipo) {
            alert("Por favor selecciona un equipo");
            return;
        }
        if (!idIntegrante) {
            alert("Por favor selecciona un integrante");
            return;
        }

        $.post("/equiposintegrantes", {
            idEquipoIntegrante: "",
            idEquipo: idEquipo,
            idIntegrante: idIntegrante
        }).done(function () {
            $("#frmEquipoIntegrante")[0].reset();
            alert("Integrante asignado al equipo correctamente");
            buscarEquiposIntegrantes();
        }).fail(function () {
            alert("Error al guardar integrante-equipo");
        });
    });
});

// Eliminar integrante-equipo
$(document).on("click", ".btnEliminarEquipoIntegrante", function () {
    const id = $(this).data("id");

    if (confirm("¿Seguro que quieres eliminar este registro?")) {
        $.post("/equiposintegrantes/eliminar", { id: id }, function () {
            $(`button[data-id='${id}']`).closest("tr").remove();
        }).fail(function () {
            alert("Error al eliminar el registro");
        });
    }
});

//////////////////////////////////////////////////////////
// proyectosavances controller (CORREGIDO)
app.controller("proyectosavancesCtrl", function ($scope, $http) {

    // Cargar proyectos en el dropdown
    function cargarProyectos() {
        $.get("/proyectos/lista", function (proyectos) {
            const $selectProyecto = $("#slcProyecto");
            $selectProyecto.empty();
            $selectProyecto.append('<option value="">Seleccionar proyecto...</option>');

            proyectos.forEach(function(proyecto) {
                $selectProyecto.append(`<option value="${proyecto.idProyecto}">${proyecto.tituloProyecto}</option>`);
            });
        }).fail(function() {
            alert("Error al cargar proyectos");
        });
    }

    // Buscar proyectos avances
    function buscarProyectosAvances() {
        $.get("/tbodyProyectosAvances", function (trsHTML) {
            $("#tbodyProyectosAvances").html(trsHTML);
        }).fail(function () {
            console.log("Error al cargar avances");
        });
    }

    // Inicializar
    cargarProyectos();
    buscarProyectosAvances();

    // Pusher
    Pusher.logToConsole = true;

    var pusher = new Pusher('85576a197a0fb5c211de', {
        cluster: 'us2'
    });

    var channel = pusher.subscribe("proyectosAvanceschannel");
    channel.bind("proyectosAvancesevent", function(data) {
        buscarProyectosAvances();
    });

    // Insertar Proyecto Avance
    $(document).on("submit", "#frmProyectoAvance", function (event) {
        event.preventDefault();

        const idProyecto = $("#slcProyecto").val();
        const progreso = $("#txtProgreso").val();
        const descripcion = $("#txtDescripcion").val();

        if (!idProyecto) {
            alert("Por favor selecciona un proyecto");
            return;
        }
        if (!progreso) {
            alert("Por favor ingresa el progreso");
            return;
        }

        $.post("/proyectoavance", {
            idProyectoAvance: "",
            idProyecto: idProyecto,
            txtProgreso: progreso,
            txtDescripcion: descripcion
        }).done(function(response) {
            $("#frmProyectoAvance")[0].reset();
            alert("Avance guardado correctamente");
            buscarProyectosAvances();
        }).fail(function(xhr) {
            alert("Error al guardar: " + (xhr.responseText || xhr.statusText));
        });
    });

    // Eliminar Proyecto Avance
    $(document).on("click", ".btnEliminarAvance", function () {
        const id = $(this).data("id");

        if (confirm("¿Seguro que quieres eliminar este avance?")) {
            $.post("/proyectoavance/eliminar", { id: id }, function () {
                $(`button[data-id='${id}']`).closest("tr").remove();
            }).fail(function () {
                alert("Error al eliminar el avance");
            });
        }
    });
});

/////////////////////////////////////////////////////////

// Luxon DateTime y variable de fecha/hora
const DateTime = luxon.DateTime;
let lxFechaHora = null;

document.addEventListener("DOMContentLoaded", function (event) {
    const configFechaHora = {
        locale: "es",
        weekNumbers: true,
        minuteIncrement: 15,
        altInput: true,
        altFormat: "d/F/Y",
        dateFormat: "Y-m-d"
    };

    activeMenuOption(location.hash);
});



