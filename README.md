# Nutrias Chambeadoras

Cuenta regresiva para el día de cobro y el aguinaldo, con feriados de Paraguay y notificaciones del navegador.

## Qué hace

- **Contador de cobro**: días, horas, minutos y segundos hasta el próximo sueldo.
- **Contador de aguinaldo**: lo mismo apuntando a diciembre.
- **Feriados de Paraguay**: se usan para ajustar la fecha de cobro (si cae feriado o fin de semana, se adelanta al día hábil anterior).
- **Notificaciones**: avisos del navegador a los 3 días, 1 día y el mismo día del cobro; y a los 7 días y el día del aguinaldo. Funcionan mientras la pestaña esté abierta.

## Estructura

```
index.html      · estructura del sitio
styles.css      · estilos (tema oscuro + turquesa)
app.js          · lógica de contadores, feriados y notificaciones
feriados.json   · referencia de feriados (los usados están incrustados en app.js)
img/            · imágenes de las nutrias
```

## Correr en local

Es un sitio estático. Abrí `index.html` con doble clic, o serví la carpeta con cualquier servidor estático.

## Publicación

Se despliega solo a **GitHub Pages** con GitHub Actions en cada push a `main`
(ver `.github/workflows/deploy.yml`).

## Configurar fechas

Las fechas de cobro y aguinaldo están fijas en `app.js`, en la constante `DEFAULTS`
al inicio del archivo:

```js
const DEFAULTS = { payDay: 30, payShift: 'before', aguiMonth: 11, aguiDay: 16 };
```

- `payDay`: día del mes en que se cobra.
- `payShift`: `before` (adelantar), `after` (posponer) o `none` (dejar igual) si cae feriado/finde.
- `aguiMonth`: mes del aguinaldo (0 = enero … 11 = diciembre).
- `aguiDay`: día del aguinaldo.
