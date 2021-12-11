import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const local = localStorage.getItem("@RocketShoes:cart");

    if (local) {
      return JSON.parse(local);
    }

    return [];
  });
  console.log("cart", cart);

  const addProduct = async (productId: number) => {
    try {
      //"clonar" meu cart
      const newCart = [...cart];
      //if cartId bater com ProductId um novo array e retornado
      const productsExist = newCart.find((item) => item.id === productId);

      console.log("product exists", productsExist);

      const stock = await api.get(`/stock/${productId}`);

      //busco o amount do meu estoque
      const stockAmount = stock.data.amount;
      //busco o amount do cart, se existe ele retorno o amount, se não retorna  0
      const currentAmount = productsExist ? productsExist.amount : 0;

      //o amount é igual o currentAmout do meu cart +1
      const amount = currentAmount + 1;

      //verifico se meu amount e maior que o amount do estoque
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      //verifico se há products que
      //se sim atribuo incremento o meu products com o novo amount
      if (productsExist) {
        productsExist.amount = amount;

        //se não existe products, eu busco o produto pelo id na rota
      } else {
        const product = await api.get(`products/${productId}`);
        //então, dou um push no newCart com o produto que foi buscado
        const newProduct = {
          ...product.data,
          amount: 1,
        };
        newCart.push(newProduct);
        console.log("Produto não existia agora foi adicionado!");
      }

      //seto no cart o array atualizado que foi gerado com o pish do newProduct

      setCart(newCart);
      //perpetuação dos dados no meu api storage
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      //caso não exista produto e retornado um erro
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //novamente, "clono meu cart" para manter a imutabiidade
      const newCart = [...cart];

      //se o id do cart atual bater com o id recebido da função, então atribuo a productIndex
      const productIndex = newCart.findIndex(
        (product) => product.id === productId
      );
      console.log("index", productIndex);

      //o findIndex se não achar nada retorno -1
      //então caso >0 foi encontrado

      if (productIndex > 0) {
        newCart.splice(productIndex, 1);

        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const newCart = [...cart];
      const productExists = newCart.find(
        (products) => products.id === productId
      );

      if (productExists) {
        productExists.amount = amount;
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
