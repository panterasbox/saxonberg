/*BoK - 9/26/93*/
inherit ObjectCode;
 
#define AMOUNT -10
#define KIND "youth"
#define COLOR "blue"
#define DRINKSTR "You feel weak for a moment and then feel your youth return to you."
int ran, is_spoiled;
 
int query_is_spoiled() { return is_spoiled; }
int set_is_spoiled(int n) { is_spoiled=n; }
 
void extra_create()
{
    set_name(COLOR+" "+KIND+" potion");
    add_alias(COLOR);
    add_alias(COLOR+" potion");
    add_alias("vial");
    add_alias(KIND+" potion");
    add_alias("potion");
    set_short("a small vial of "+COLOR+" liquid");
    set_long(
    "This is a small vial of "+COLOR+" liquid.  The liquid bubbles softly\n"+
    "inside the vial.  A small cork stopper resides on the opening of\n"+
    "the bottle.  You might try <drink "+COLOR+">ing it.\n"
    );
    set_weight(1);
    set_value(0);
}
 
void init()
{
  add_action("do_drink","drink");
}
 
int do_drink(string arg)
{
  if(!arg) { write("Drink what?\n"); return 0; }
  if(arg==COLOR) {
    if(ENV(THISO)!=THISP) return 0;
    write("You take the cork off the vial and quaff the contents.\n");
    if(THISO->query_is_spoiled()==0) {
      THISP->add_body_age(AMOUNT);
      write(DRINKSTR+"\n");
      say(PNAME+" quaffs a potions contents.\n");
    }
    if(THISO->query_is_spoiled()==1) {
      THISP->add_body_age(-AMOUNT);
      write("You cough, gag, and scream in realization that you have aged!\n");
      write("Someone had spoiled the vials contents!\n");
      say(PNAME+" quaffs the contents of a spoiled potion!\n");
    }
    ran=random(5)+1;
    if(ran==1) { 
      THISP->change_stat("str",(THISP->query_stat("str")-1));
      destruct(THISO); return 1; }
    if(ran==2) { 
      THISP->change_stat("int",(THISP->query_stat("int")-1));
      destruct(THISO); return 1; }  
    if(ran==3) { 
      THISP->change_stat("wil",(THISP->query_stat("wil")-1));
      destruct(THISO); return 1; }  
    if(ran==4) {
      THISP->change_stat("con",(THISP->query_stat("con")-1));
      destruct(THISO); return 1; }  
    if(ran==5) { 
      THISP->change_stat("dex",(THISP->query_stat("dex")-1));         
      destruct(THISO); return 1; }  
    if(ran==6) { 
      THISP->change_stat("chr",(THISP->query_stat("chr")-1));
      destruct(THISO); return 1; }
  }
  return 1;
}
