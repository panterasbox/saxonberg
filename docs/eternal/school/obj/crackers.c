inherit HealingCode;
#include "../defs.h"

extra_create(){
   
   set("name", "Peanut Butter Crackers");
   set("id", ({"cracker", "crackers", "Cracker", "Crackers",
      "peanut butter crackers", "Peanut Butter Crackers" }) );
   set("short", "a sleeve of Peanut Butter Crackers");
   set("solid", 1);
   set("heal_action", "eat");
   set("heal_array", ({7, 7, 7, 9}) );
   set("heal_uses", 6);
   set(HealingP, 1);
   set("value", 20);
   set("weight", 25);
   set(FoodP, 1);
   set("action_msg", 
      ({ "You eat a peanut butter cracker and feel a little better.",
      " eats a tasty peanut butter cracker."  })
      );

}

long() {
   return "This is a sleeve of toasty crackers with peanut butter.  "
      "There were originally 6 tasty peanut butter and cracker sandwiches "
      "in the sleeve.  They look good enough to eat!\n\nNumber remaining:"
      " "+query( "heal_uses" )+".";
   }
