let utils = require('./utils.js')

let ico = artifacts.require("./LympoICO.sol");
let token = artifacts.require("./LympoToken.sol");

let teamReserve = 100000000e18; // 10%
let advisersReserve = 30000000e18; // 3%
let ecosystemReserve = 220000000e18; // 22%

let pre_maxGoal = 265000000e18; // 265 Million LYM Tokensssß
let pre_start = 1516618800; // Monday, 22 January 2018 11:00:00 GMT
let pre_end = 1517655600; // Saturday, 3 February 2018 11:00:00 GMT
let pre_prices = [60000, 50000];
let pre_amount_stages = [90000000e18];

let maxGoal = 385000000e18; // 385 Million LYM Tokens
let start = 1518865200; // Saturday, 17 February 2018 11:00:00 GMT
let end = 1519815600; // Wednesday, 28 February 2018 11:00:00 GMT
let prices = [40000];

let tokenStartTime = end;
let owner = "0x376c9fde9555e9a491c4cd8597ca67bb1bbf397e";
let advisers_wallet = "0x0cbe666498dd2bb2f85b644b5f882e4136ac9558";
let ecosystem_wallet = "0xcb88efbfb68a1e6d8a4b0bcf504b6bb6bd623444";
let tokenInstance, icoInstance;

let logging = false;
let thresholds_turned_off = false; // additional tests without thresholds in exchange function

contract('ico', accounts => {
         
         before(async() => {
                tokenInstance = await token.new(owner, advisers_wallet, ecosystem_wallet);
                icoInstance = await ico.new(
                                            tokenInstance.address,
                                            owner,
                                            owner
                                            );
                });
         
         it("test initialization", async() => {
            let pre_max = await icoInstance.pre_maxGoal.call();
            if (logging) console.log('max_goal pre-ICO: ' + pre_max.toNumber());
            assert.equal(pre_max.toNumber(), pre_maxGoal, "pre-ICO max goal is incorrect");
            
            let preicoStartTime = await icoInstance.pre_start.call();
            assert.equal(preicoStartTime.toNumber(), pre_start, "wrong start date");
            
            let preicoEndTime = await icoInstance.pre_end.call();
            assert.equal(preicoEndTime.toNumber(), pre_end, "wrong end date");
            if (logging) console.log('pre-ico starts: ' + new Date(pre_end * 1e3).toISOString());
            
            let mGoal = await icoInstance.maxGoal.call();
            assert.equal(mGoal.toNumber(), maxGoal, "ICO max goal is incorrect");
            if (logging) console.log('maxGoal: ' + mGoal.toNumber());
            
            let icoStartTime = await icoInstance.start.call();
            assert.equal(icoStartTime.toNumber(), start, "wrong start date");
            
            let icoEndTime = await icoInstance.end.call();
            assert.equal(icoEndTime.toNumber(), end, "wrong end date");
            if (logging) console.log('ico starts: ' + new Date(start * 1e3).toISOString());
        });
         
         it("should fail to buy tokens, because too early", async() => {
            let result;
            try {
                result = await icoInstance.exchange(accounts[2], {value: web3.toWei(300, "ether")});
                throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
            } catch (error) {
                let balance = await tokenInstance.balanceOf.call(accounts[2]);
                assert.equal(balance.toNumber(), 0);
            }
        });
         
          it("test prices and token amounts in each period", async() => {
             
             await icoInstance.setCurrent(pre_start);
             
             let pre_price = await icoInstance.getPrice.call();
             if (logging) console.log('current pre-ico price: ' + pre_price.toNumber());
             assert.equal(pre_price.toNumber(), pre_prices[0], "current pre-price is incorrect");
             
             for (i = 0; i < pre_prices.length; i++) {
                let pre_price = await icoInstance.pre_prices.call(i);
                if (logging) console.log("price["+ i + "]: " + pre_price.toNumber());
                assert.equal(pre_price.toNumber(), pre_prices[i], "pre_prices["+i+"] is incorrect");
             }
             for (i = 0; i < pre_amount_stages.length; i++) {
                let pre_amount = await icoInstance.pre_amount_stages.call(i);
                if (logging) console.log("pre_amount_stages["+ i + "]: " + pre_amount.toNumber());
                assert.equal(pre_amount.toNumber(), pre_amount_stages[i], "pre_amount_stages["+i+"] is incorrect");
             }
             
             await icoInstance.setCurrent(start+10);
             
             let tokensSold = await icoInstance.tokensSold.call();
             if (logging) console.log('tokensSold: ' + tokensSold.toNumber());
             let price = await icoInstance.getPrice.call();
             if (logging) console.log('current price: ' + price.toNumber());
             assert.equal(price.toNumber(), prices[0], "current price is incorrect");
             
             for (i = 0; i < prices.length; i++) {
                let price = await icoInstance.prices.call(i);
                if (logging) console.log("price["+ i + "]: " + price.toNumber());
                assert.equal(price.toNumber(), prices[i], "prices["+i+"] is incorrect");
             }
             /*
             for (i = 0; i < amount_stages.length; i++) {
                let amount = await icoInstance.amount_stages.call(i);
                if (logging) console.log("amount["+ i + "]: " + amount.toNumber());
                assert.equal(amount.toNumber(), amount_stages[i], "amount["+i+"] is incorrect");
             }
              */
         });
         
         
         it("should buy some LYM during pre-ICO", async() => {
            await icoInstance.setCurrent(pre_start);
            let approve_result = await tokenInstance.approve(icoInstance.address, pre_maxGoal+maxGoal);
            let result = await icoInstance.exchange(accounts[2], {value: web3.toWei(1, "ether")});
            let event = result.logs[0].args;
            assert.equal(event.amount.toNumber(), web3.toWei(1, "ether"));
            
            let token_balance = await tokenInstance.balanceOf(accounts[2]);
            assert.equal(token_balance.toNumber(), pre_prices[0]*1e18, "token amount doesn't match during pre-ico");
            if (logging) console.log('token amount bought during pre-ico: ' + token_balance.toNumber());
            
            let amount_balance = await icoInstance.balances.call(accounts[2]);
            assert.equal(amount_balance.toNumber(), web3.toWei(1, "ether"), "spend amount doesn't match during pre-ico");
            
            let pre_tokensSold = await icoInstance.pre_tokensSold.call();
            if (logging) console.log('token_sold during pre-ico: ' + pre_tokensSold);
            
            let amountRaised = await icoInstance.amountRaised.call();
            if (logging) console.log('amountRaised during pre-ico: ' + amountRaised);
            assert.equal(amountRaised.toNumber(), web3.toWei(1, "ether"), "amount raised incorrect during pre-ico");
        });
         
         if (!thresholds_turned_off)
         {
             it("should buy LYM during pre-ICO, bought too much and fail", async() => {
                let result;
                try {
                    result = await icoInstance.exchange(accounts[2], {value: web3.toWei(2000, "ether")});
                    throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
                } catch (error) {
                    let token_sold = await icoInstance.tokensSold.call();
                    if (logging) console.log('token_sold during pre-ico: ' + token_sold);
        
                    let amountRaised = await icoInstance.amountRaised.call();
                    if (logging) console.log('amountRaised during pre-ico: ' + amountRaised);
                }
            });
         }
         
          it("should buy some LYM in between of pre-ICO and ICO, and should fail", async() => {
             await icoInstance.setCurrent(pre_end + 1);
             let result;
             try {
                 result = await icoInstance.exchange(accounts[3], {value: web3.toWei(1, "ether")});
                 throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
             } catch (error) {
                 let balance = await tokenInstance.balanceOf.call(accounts[3]);
                 assert.equal(balance.toNumber(), 0);
             }
         });
         
         
         it("should buy some LYM during ICO", async() => {
            await icoInstance.setCurrent(start);
            let result = await icoInstance.exchange(accounts[3], {value: web3.toWei(1, "ether")});
            let event = result.logs[0].args;
            assert.equal(event.amount.toNumber(), web3.toWei(1, "ether"));
            
            let token_balance = await tokenInstance.balanceOf.call(accounts[3]);
            assert.equal(token_balance.toNumber(), prices[0]*1e18, "token amount doesn't match during ico");
            if (logging) console.log('token amount bought during ico: ' + token_balance.toNumber());
            
            let amount_balance = await icoInstance.balances.call(accounts[3]);
            assert.equal(amount_balance.toNumber(), web3.toWei(1, "ether"), "spend amount doesn't match during ico");
            
            let token_sold = await icoInstance.tokensSold.call();
            if (logging) console.log('token_sold during ico: ' + token_sold);
            
            let amountRaised = await icoInstance.amountRaised.call();
            if (logging) console.log('amountRaised during ico: ' + amountRaised);
            assert.equal(amountRaised.toNumber(), web3.toWei(2, "ether"), "amount raised incorrect during ico"); // pre-ico + ico
        });
         
         it("should fail to buy tokens with too low msg.value", async() => {
            try {
                let result = await icoInstance.exchange(accounts[6], {value: web3.toWei(0.0, "ether") });
                throw new Error('Promise was unexpectedly fulfilled. Result: ' + result);
            } catch (error) {
                let bal = await tokenInstance.balanceOf.call(accounts[6]);
                assert.equal(bal.toNumber(), 0);
            }
        });
         
         it("should fail to close crowdsale because too early", async() => {
            await icoInstance.checkGoalReached({from: owner});
            let reached = await icoInstance.crowdsaleEnded.call();
            assert.equal(reached, false, "crowdsale end shouldn't be reached");
        });
    
         if (thresholds_turned_off)
         {
            it("should close the crowdsale. goal should be reached. Should burn unsold tokens.", async() => {
                let result0 = await icoInstance.exchange(accounts[3], {value: web3.toWei(7500, "ether")});
            
                
                let bal_before = await tokenInstance.balanceOf(accounts[0]);
                if (logging) console.log('bal_before: ' + bal_before);
                await icoInstance.setCurrent(end+10);
                await tokenInstance.setCurrent(end+10);
                let result = await icoInstance.checkGoalReached({from: owner});
                console.log('result log: ' + JSON.stringify(result.logs[0]));
                
                let closed = await icoInstance.crowdsaleEnded.call();
                assert.equal(closed, true, "crowdsale should be already closed");

                // check team reserve
                let reserve = await tokenInstance.balanceOf(accounts[0]);
                if (logging) console.log('reserve: ' + reserve);
                assert.equal(reserve.toNumber(), teamReserve, "incorrect reserved amount");
               
                // check advisers reserve
                let advisers_balance = await tokenInstance.balanceOf(accounts[7]);
                assert.equal(advisers_balance.toNumber(), advisersReserve);

                // check ecosystem reserve
                let ecosystem_balance = await tokenInstance.balanceOf(accounts[8]);
                assert.equal(ecosystem_balance.toNumber(), ecosystemReserve);
                
                let supply = await tokenInstance.totalSupply.call();
                if (logging) console.log('supply: ' + supply);
                assert.equal(supply.toNumber(), (teamReserve/1e18 + advisersReserve/1e18 + ecosystemReserve/1e18 + (7500e18 * prices[0])/1e18 + pre_prices[0] + prices[0]) * 1e18, "incorrect total supply after burning");
            });
         
             it("should fund the crowdsale contract from the owner's wallet", async() => {
                await icoInstance.sendTransaction({value: web3.toWei(20000, "ether")});
                assert.equal(web3.eth.getBalance(icoInstance.address).toNumber(), web3.toWei(20000, "ether"));
            });
         
             it("should withdraw the exchanged amount", async() => {
                let bal_before = await icoInstance.balances.call(accounts[2]);
                if (logging) console.log('bal_before: ' + bal_before);
                let result = await icoInstance.safeWithdrawal({from: accounts[2]});
                let bal = await icoInstance.balances.call(accounts[2]);
                assert.equal(bal.toNumber(), 0);
                if (logging) console.log('bal_after: ' + bal);
            });
         }
         
         

});


