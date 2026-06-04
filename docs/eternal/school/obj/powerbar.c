inherit HealingCode;
#include "../defs.h"

extra_create(){
   
   set("name", "Power Bar");
   set("id", ({"bar", "power", "chocolate", "chocolate power bar",
      "power bar", "powerbar" }) );
   set("short", "a chocolate Power Bar");
   set("long", "This is a chocolate Power Bar.  If the commercials are "  
      "any indication, it should revitalize you!  Maybe you should <eat> it.");
   set("solid", 1);
   set("heal_action", "eat");
   set("heal_array", ({30, 0, 30, 30}) );
   set("heal_uses", 1);
   set(HealingP, 1);
   set("value", 20);
   set("weight", 25);
   set(FoodP, 1);
   set("action_msg", 
      ({ "You chomp down on a Power Bar and feel revitalized.",
      " wolfs down an entire Power Bar.  Wow."  })
      );

}

