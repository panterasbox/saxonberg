inherit HealingCode;
#include "../defs.h"

extra_create(){
   
   set("name", "strawberry daiquiri");
   set("id", ({"daiquiri", "strawberry daiquiri", "drink" }) );
   set("short", "a strawberry daiquiri");
   set("long", "This is a strawberry daiquiri, usually served in a hurricane "
      "glass.  Sometimes there's an umbrella served with it, but this one doesn't "
      "seem to have one.  You could probably <drink> it.");
   set("solid", 0);
   set("heal_action", "drink");
   set("heal_array", ({20, 0, 30, 50}) );
   set("heal_uses", 1);
   set(HealingP, 1);
   set("value", 50);
   set("weight", 25);
   set(FoodP, 1);
   set("action_msg", 
      ({ "You drink the entire strawberry daiquiri, and feel a little light-headed.",
      " drinks an entire strawberry daiquiri.  What a sissy drink."  })
      );

}
