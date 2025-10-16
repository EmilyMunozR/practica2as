// app.js (corregido)

function activeMenuOption(href) {
    $(".app-menu .nav-link")
        .removeClass("active")
        .removeAttr("aria-current");

    $(`[href="${(href ? href : "#/")}"]`)
        .addClass("active")
        .attr("aria-current", "page");
}
/*
function disableAll() {
    const elements = document.querySelectorAll(".while-waiting")
    elements.forEach(function (el, index) {
        el.setAttribute("disabled", "true")
        el.classList.add("disabled")
    })
}
function enableAll() {
    const elements = document.querySelectorAll(".while-waiting")
    elements.forEach(function (el, index) {
        el.removeAttribute("disabled")
        el.classList.remove("disabled")
    })
}
function debounce(fun, delay) {
    let timer
    return function (...args) {
        clearTimeout(timer)
        timer = setTimeout(function () {
            fun.apply(this, args)
        }, delay)
    }
}

const DateTime = luxon.DateTime
let lxFechaHora
let diffMs = 0
const configFechaHora = {
    locale: "es",
    weekNumbers: true,
    // enableTime: true,
    minuteIncrement: 15,
    altInput: true,
    altFormat: "d/F/Y",
    dateFormat: "Y-m-d",
    // time_24hr: false
}
*/
const app = angular.module("angularjsApp", ["ngRoute"]);
app.config(function ($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix("");

    $routeProvider
        .when("/", {
            templateUrl: "/login",
            controller: "appCtrl"
        })
        .when("/dashboard", {
            templateUrl: "/dashboard",
            controller: "dashboardCtrl"
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

    $rootScope.slide        = "";
    $rootScope.spinnerGrow  = false
    $rootScope.login        = false

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
app.controller("appCtrl", function ($scope, $http, $rootScope, $location) {
    // Función para deshabilitar todos los inputs y botones
    function disableAll() {
        $("input, button").prop("disabled", true);
    }

    // Función para habilitar todos los inputs y botones
    function enableAll() {
        $("input, button").prop("disabled", false);
    }

    // Evento de envío del formulario de inicio de sesión
    $("#frmInicioSesion").submit(function (event) {
        event.preventDefault();

        pop(".div-inicio-sesion", 'ℹ️ Iniciando sesión, espere un momento...', "primary");
        disableAll();

        const datos = {
            txtUsuario: $("#txtUsuario").val().trim(),
            txtContrasena: $("#txtContrasena").val().trim()
        };

        if (!datos.txtUsuario || !datos.txtContrasena) {
            enableAll();
            pop(".div-inicio-sesion", "Por favor ingresa usuario y contraseña", "warning");
            return;
        }

        $.post("/iniciarSesion", datos)
            .done(function (respuesta) {
                enableAll();

                if (respuesta.mensaje) {
                    localStorage.setItem("login", "1");
                    localStorage.setItem("preferencias", JSON.stringify(respuesta.usuario || {}));
                    $("#frmInicioSesion")[0].reset();
                    window.location.href = "/dashboard#/integrantes"
                } else {
                    pop(".div-inicio-sesion", "Usuario y/o contraseña incorrectos", "danger");
                }
            })
            .fail(function (xhr) {
                enableAll();
                const errorMsg = xhr.responseJSON?.error || "Error interno del servidor";
                pop(".div-inicio-sesion", errorMsg, "danger");
            });
    });
});

///////////////// DashboardController
app.controller("dashboardCtrl", function ($scope, $rootScope, $http) {
    $http.get("/preferencias")
        .then(function (respuesta) {
            $rootScope.login = true;
            $rootScope.usuario = respuesta.data.usr;
            $rootScope.tipoUsuario = respuesta.data.tipo;
            $rootScope.spinnerGrow = false;
        })
        .catch(function () {
            $rootScope.login = false;
            $rootScope.spinnerGrow = false;
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

    var pusher = new Pusher('85576a197a0fb5c211de', { cluster: 'us2' });
    var channel = pusher.subscribe("integranteschannel");
    channel.bind("integrantesevent", function(data) {
        buscarIntegrantes();
    });

    // Insertar Integrantes
    $(document).on("submit", "#frmIntegrante", function (event) {
        event.preventDefault();
        
        const id = $("#idIntegrante").val()
        const nombreIntegrnate = $("#txtNombreIntegrante").val().trim()

         if (!nombreIntegrante) {
            alert("Por favor ingresa un integrante.")
            return
        }
        
        $.post("/integrante", {
            idIntegrante: "",
            nombreIntegrante: $("#txtNombreIntegrante").val()
        }).done(function () {
            alert("Integrante Añadido correctamente");
            $("#frmIntegrante")[0].reset();
            $("#btnGuardarIntegrante").text("Guardar")
            buscarIntegrantes();
        }).fail(function () {
            alert("Error al guardar integrante");
        });
    });
});

// Modificar Integraantes
$(document).on("click", ".btnModificarIntegrante", function () {
    const id = $(this).data("id");

    $.get(`/integrante/${id}`, function (data) {
        $("#idIntegrante").val(data.idIntegrante);
        $("#txtNombreIntegrante").val(data.nombreIntegrante);
        $(".btn-primary").text("Actualizar"); 
    }).fail(function () {
        alert("Error al traer integrante");
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








///////////////// proyectos controller /////////////////////////////////////////////////////////////////////
app.controller("proyectosCtrl", function ($scope, $http) {
    // Función para cargar equipos en el dropdown
    function cargarEquipos() {
        $.get("/equipos/lista", function (equipos) {
            const $selectEquipo = $("#txtEquipo");
            $selectEquipo.empty();
            $selectEquipo.append('<option value="">Seleccionar equipo...</option>');
            equipos.forEach(function(equipo) {
                $selectEquipo.append(<option value="${equipo.idEquipo}">${equipo.nombreEquipo}</option>);
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

  $(document).on("click", ".btnModificarProyecto", function () {
        const id = $(this).data("id");
        
        $.get(`/proyectos/${id}`, function (data) {
            // Cargar equipos primero
            cargarEquipos();
            
            // Llenar los datos
            $("#idProyecto").val(data.idProyecto);
            $("#txtNombreProyecto").val(data.tituloProyecto);
            $("#txtObjetivo").val(data.objetivo);
            $("#txtEstado").val(data.estado);
            
            // Esperar a que se carguen los equipos y seleccionar el correcto
            setTimeout(function() {
                $("#txtEquipo").val(data.idEquipo);
            }, 100);
            
            // Cambiar texto del botón
            $("#frmProyectos button[type='submit']").text("Actualizar");
            
            // Scroll hacia el formulario
            $('html, body').animate({
                scrollTop: $("#frmProyectos").offset().top - 20
            }, 500);
        }).fail(function () {
            alert("Error al cargar datos del proyecto");
        });
    });
    

    
    // Eliminar Proyectos
    $(document).on("click", ".btnEliminarProyecto", function () {
        const id = $(this).data("id");
        if (confirm("¿Seguro que quieres eliminar este proyecto?")) {
            $.post("/proyectos/eliminar", { id: id }, function () {
                $(button[data-id='${id}']).closest("tr").remove();
            }).fail(function () {
                alert("Error al eliminar el proyecto");
            });
        }
    });
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
//modficar
$(document).on("click", ".btnModificarEquipoIntegrante", function () {
    const idEquipoIntegrante = $(this).data("id");
    const idEquipo = $(this).data("idequipo");
    const idIntegrante = $(this).data("idintegrante");

    $("#idEquipoIntegrante").val(idEquipoIntegrante);
    $("#txtEquipo").val(idEquipo);
    $("#txtIntegrante").val(idIntegrante);
    $("#btnGuardar").text("Actualizar");
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






























