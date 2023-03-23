import express from "express";
const router = express.Router();
import multer from "multer";

//вытаскиваем модель данных товара по базе данных MongoDb
import Product from "../models/Product.js";
//вытаскиваем функцию проверки существования авторизованного пользователя
import auth from "../middleware/auth.js";

//функция процесса сохранения изображений 
var storage = multer.diskStorage({
    //путь к папке в проекте server в которой будем сохранять новые изображения
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    //имя файла нового изображения
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`)
    },
    //допустимые расширения изображений
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        if (ext !== '.jpg' || ext !== '.png') {
            return cb(res.status(400).end('only jpg, png, mp4 are allowed'), false)
        }
        cb(null, true)
    }
})

//функция сохранения изображений нового товара от авторизованного пользователя в проекте server
var upload = multer({storage: storage}).single("file")

//=================================
//             Product
//=================================

//маршрутизатор запроса на сохранение изображения нового товара от авторизованного пользователя в проекте server
router.post("/uploadImage", auth, (req, res) => {
    //сохраняем изображения нового товара от авторизованного пользователя в проекте server
    upload(req, res, err => {
        if (err) return res.json({success: false, err});
        return res.json({success: true, image: res.req.file.path, filename: res.req.file.filename})
    })
});

//маршрутизатор запроса на загрузку товара на сервер по авторизованному пользователю
router.post("/uploadProduct", auth, (req, res) => {
    // формируем модель самого товара по исходным данным req.body
    const product = new Product(req.body);
    //сохраняем товар в базе данных на сервере
    product.save((err) => {
        if (err) return res.status(400).json({success: false, err});
        return res.status(200).json({success: true});
    })
});

//маршрутизатор загрузки товара с сервера по имеющимся параметрам
router.post("/getProducts", (req, res) => {
    //порядок сортировки скачиваемых товаров
    let order  = "desc";
    //скаченные товары сортируем по их идентификатору
    let sortBy = "_id";
    //максимальное число скачиваемых товаров 
    let limit  = req.body.limit ? parseInt(req.body.limit) : 100;
    //число товаров, которые пропускаются перед их скачиванием
    let skip   = parseInt(req.body.skip); 

    //список цен или стран по которому фильтруем скачиваемые товары 
    let findArgs = {};
    //по метке searchTerm фильтруем указанные товары исходя из их названия или описания
    let term = req.body.searchTerm;

    for (let key in req.body.filters) {
        if (req.body.filters[key].length > 0) {
            if (key === "price") {
                //составляем список цен по которому фильтруем скачиваемые товары
                findArgs[key] = {
                    $gte: req.body.filters[key][0],
                    $lte: req.body.filters[key][1]
                }
            } else {
                //составляем список стран по которому фильтруем скачиваемые товары
                findArgs[key] = req.body.filters[key];
            }
        }
    }

    if (term) {
        //метка term существует
        //товары фильтруем по массиву findArgs
        Product.find(findArgs)
            //товары фильтруем по их названию или описанию исходя из метки term
            .find({$text: {$search: term}})
            //выводим полную информацию о составителе товара
            .populate("writer")
            //сортируем скачиваемые товары по их идентификатору в порядке убывания 
            .sort([[sortBy, order]])
            //определенное число товаров пропускаем
            .skip(skip)
            //определенное число товаров скачиваем
            .limit(limit)
            .exec( (err, products) => {
                //скачивание товаров оказалось не успешным
                if (err) return res.status(400).json({success: false, err});
                //скачивание товаров оказалось успешным
                res.status(200).json({success: true, products, postSize: products.length});
            })  
    } else {
        //метка term не существует
        //товары фильтруем по массиву findArgs
        Product.find(findArgs)
            //выводим полную информацию о составителе товара
            .populate("writer")
            //сортируем скачиваемые товары по их идентификатору в порядке убывания 
            .sort([[sortBy, order]])
            //определенное число товаров пропускаем
            .skip(skip)
            //определенное число товаров скачиваем
            .limit(limit)
            .exec( (err, products) => {
                //скачивание товаров оказалось не успешным
                if (err) return res.status(400).json({success: false, err});
                //скачивание товаров оказалось успешным
                res.status(200).json({success: true, products, postSize: products.length});
            })  
    }
});

//маршрутизатор запроса на получение информации о товарах в корзине авторизованного пользователя по их идентификаторам
router.get("/products_by_id", (req, res) => {
    //вытаскиваем тип данных type
    let type = req.query.type;
    //вытаскиваем данные в виде массива идентификаторов товаров productIds
    let productIds = req.query.id;

    if (type === "array") {
        let ids = req.query.id.split(',');
        productIds = [];
        productIds = ids.map(item => {
            return item;
        })
    }

    //ищем информацию о товарах с идентификаторами в массиве productIds
    Product.find({'_id': {$in: productIds}})
    //выводим полную информацию о пользователе который выбрал указанные товары
    .populate('writer').exec((err, product) => {  
        //поиск указанной информации оказался неудачным 
        if (err) return res.status(400).send(err);
        //поиск указанной информации оказался успешным
        return res.status(200).send(product)
    })
});

export default router;