inherit HealingCode;
#include "../defs.h"

extra_create(){
   
   set("name", "light beer");
   set("id", ({"beer", "natural light", "Natural Light", "can", "light beer", "drink" }) );
   set("short", "a can of Natural Light beer");
   set("long", "This is a can of Natural Light beer.  It looks like water, "
      "smells faintly of beer, and tastes like piss.  It'll probably give "
      "you a little buzz.");
   set("solid", 0);
   set("heal_action", "drink");
   set("heal_array", ({20, 10, 15, 50}) );
   set("heal_uses", 1);
   set(HealingP, 1);
   set("value", 50);
   set("weight", 25);
   set(FoodP, 1);
   set("action_msg", 
      ({ "You chug down the can of Natural Light.  Ick.",
      " chugs down an entire can of Natural Light.  Ick."  })
      );

}
