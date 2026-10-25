import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { registerUser } from '../modules/users/register-user.service.js';
import { createAccount } from '../modules/accounts/accounts.service.js';
import { registerPayment } from '../modules/payments/payments.service.js';
import { processNotifications } from '../modules/notifications/notifications.service.js';
import { processWeeklySummaries } from '../modules/messages/messages.service.js';
import { addDays,businessDay } from '../modules/notifications/dates.js';
import { registerUserSchema } from '../modules/users/user.schema.js';

try {
  if(process.env.NODE_ENV==='production') throw new Error('Dados demonstrativos são permitidos apenas em ambiente local/teste');
  const input=registerUserSchema.parse({nome:'Rennan · Demonstração',email:process.env.DEMO_EMAIL,senha:process.env.DEMO_PASSWORD});
  let user=await prisma.usuario.findUnique({where:{email:input.email}});
  if(user && !await bcrypt.compare(input.senha,user.senhaHash)) throw new Error('O e-mail já existe com outra senha. Não foi alterado.');
  if(!user){const created=await registerUser(input);user=await prisma.usuario.findUniqueOrThrow({where:{id:created.id}});}
  const today=businessDay();
  for(const [descricao,valor,days,paid,monthly] of [
    ['Aluguel · Demonstração',1250,-15,0,true],['Internet · Demonstração',129.90,3,0,false],
    ['Cartão · Demonstração',680,-5,200,false],['Energia · Demonstração',186.42,1,0,false],
    ['Faculdade · Demonstração',480,0,0,false],['Água · Demonstração',79.8,-10,79.8,false],
    ['Streaming · Demonstração',39.9,5,0,true]
  ] as const){
    let account=await prisma.conta.findFirst({where:{usuarioId:user.id,descricao},orderBy:{vencimento:'asc'},include:{pagamentos:true}});
    if(!account){const created=await createAccount(user.id,{descricao,valor,vencimento:addDays(today,days).toISOString().slice(0,10),tipo:monthly?'RECORRENTE':'AVULSA',recorrencia:monthly?'MENSAL':null});account=await prisma.conta.findUniqueOrThrow({where:{id:created.id},include:{pagamentos:true}});}
    if(paid && account.pagamentos.length===0){
      const hex=createHash('sha256').update(`saldo-demo:${account.id}`).digest('hex');
      const chave=`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
      await registerPayment(user.id,account.id,{valor:paid,pagoEm:today.toISOString().slice(0,10),chave});
    }
  }
  await processNotifications(today,user.id); await processWeeklySummaries(today,user.id);
  console.log('Demonstração preparada. Use DEMO_EMAIL e DEMO_PASSWORD do seu .env.');
}catch(error){console.error('Não foi possível preparar demonstração:',error instanceof Error?error.message:'erro desconhecido');process.exitCode=1;}
finally{await prisma.$disconnect();}
