import mongoose from "mongoose";
const Schema = mongoose.Schema;

//модель товара в базе данных MongoDb
const productSchema = mongoose.Schema({
    //пользователь который выбрал соответствующий товар
    writer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    //название товара
    title: {
        type: String,
        maxLength: 50
    },
    //описание товара
    description: {
        type: String
    },
    //цена товара
    price: {
        type: Number,
        default: 0
    },
    //изображения товара
    images: {
        type: Array,
        default: []
    },
    //страна изготовления товара
    continents: {
        type: Number,
        default: 1
    }
}, { timestamp: true })

productSchema.index({
    title: 'text',
    description: 'text'
}, {
    weights: {
        name: 5,
        description: 1
    }
})

//фиксируем модель товара в базе данных MongoDb
const Product = mongoose.model('Product', productSchema);
export default Product;